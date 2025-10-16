// File: app/api/projects/[projectId]/rules/[ruleId]/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

// --- PATCH: Update an existing rule ---
export async function PATCH(req: Request, { params }: { params: { ruleId: string } }) {
    try {
        // Security: We would add a check here to ensure the user owns the project this rule belongs to.
        const { userId } = await auth();
        if (!userId) return new Response("Unauthorized", { status: 401 });
        
        const { budget_usd } = await req.json();
        const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
        
        const { data, error } = await supabase.from('per_user_rules').update({ budget_usd }).eq('id', params.ruleId).select().single();
        if (error) throw error;

        return NextResponse.json(data);
    } catch (error) { /* ... */ }
}

// --- DELETE: Remove an existing rule ---
export async function DELETE(req: Request, { params }: { params: { ruleId: string } }) {
    try {
        const { userId } = await auth();
        if (!userId) return new Response("Unauthorized", { status: 401 });
        
        const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
        const { error } = await supabase.from('per_user_rules').delete().eq('id', params.ruleId);
        if (error) throw error;
        
        return new Response(null, { status: 204 }); // 204 No Content is standard for a successful delete
    } catch (error) { /* ... */ }
}