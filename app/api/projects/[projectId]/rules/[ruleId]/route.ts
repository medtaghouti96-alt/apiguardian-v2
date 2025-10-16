import { NextResponse, NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

function getIds(req: NextRequest): { projectId?: string, ruleId?: string } {
    // Helper to get both projectId and ruleId from URL
    // e.g., /api/projects/{projectId}/rules/{ruleId}
    const parts = req.nextUrl.pathname.split('/');
    const ruleId = parts.pop();
    parts.pop(); // remove 'rules'
    const projectId = parts.pop();
    return { projectId, ruleId };
}

// A security function to ensure the user owns the project this rule belongs to
async function verifyOwnership(supabase: any, userId: string, ruleId: string): Promise<boolean> {
    const { data, error } = await supabase
        .from('per_user_rules')
        .select(`id, project:projects ( user_id )`)
        .eq('id', ruleId)
        .single();
        
    if (error || !data) return false;
    return data.project.user_id === userId;
}

// --- PATCH: Update an existing rule ---
export async function PATCH(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) return new Response("Unauthorized", { status: 401 });
        
        const { ruleId } = getIds(req);
        if (!ruleId) return NextResponse.json({ error: "Rule ID missing from URL." }, { status: 400 });

        const { budget_usd } = await req.json();
        const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
        
        if (!(await verifyOwnership(supabase, userId, ruleId))) {
            return new Response("Forbidden", { status: 403 });
        }
        
        const { data, error } = await supabase.from('per_user_rules').update({ budget_usd }).eq('id', ruleId).select().single();
        if (error) throw error;

        return NextResponse.json(data);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("Error updating user rule:", errorMessage);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// --- DELETE: Remove an existing rule ---
export async function DELETE(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) return new Response("Unauthorized", { status: 401 });
        
        const { ruleId } = getIds(req);
        if (!ruleId) return NextResponse.json({ error: "Rule ID missing from URL." }, { status: 400 });

        const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
        
        if (!(await verifyOwnership(supabase, userId, ruleId))) {
            return new Response("Forbidden", { status: 403 });
        }
        
        const { error } = await supabase.from('per_user_rules').delete().eq('id', ruleId);
        if (error) throw error;
        
        return new Response(null, { status: 204 });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("Error deleting user rule:", errorMessage);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}