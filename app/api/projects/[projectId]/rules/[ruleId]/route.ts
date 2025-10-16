// File: app/api/projects/[projectId]/rules/[ruleId]/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js'; // <-- IMPORT SupabaseClient

export const runtime = 'nodejs';

function getIds(req: NextRequest): { projectId?: string, ruleId?: string } {
    const parts = req.nextUrl.pathname.split('/');
    const ruleId = parts.pop();
    parts.pop();
    const projectId = parts.pop();
    return { projectId, ruleId };
}

// A security function to ensure the user owns the project this rule belongs to
async function verifyOwnership(supabase: SupabaseClient, userId: string, ruleId: string): Promise<boolean> {
    const { data, error } = await supabase
        .from('per_user_rules')
        .select(`id, project:projects!inner ( user_id )`)
        .eq('id', ruleId)
        .single();
        
    if (error || !data) return false;

    // --- THE FIX ---
    // `data.project` is an array. We need to check the first element.
    const projectData = Array.isArray(data.project) ? data.project[0] : data.project;

    if (!projectData) return false;

    return projectData.user_id === userId;
    // --- END OF FIX ---
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
            return new Response("Forbidden: You do not own this rule.", { status: 403 });
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
            return new Response("Forbidden: You do not own this rule.", { status: 403 });
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