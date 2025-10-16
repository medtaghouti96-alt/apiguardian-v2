// File: app/api/projects/[projectId]/rules/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

// --- GET: Fetch all rules for a project ---
export async function GET(req: Request, { params }: { params: { projectId: string } }) {
    try {
        const { userId } = await auth();
        if (!userId) return new Response("Unauthorized", { status: 401 });

        const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
        
        // Security check: Make sure the project belongs to the user
        const { data: project } = await supabase.from('projects').select('id').eq('id', params.projectId).eq('user_id', userId).single();
        if (!project) return new Response("Project not found or access denied", { status: 404 });
        
        const { data: rules, error } = await supabase.from('per_user_rules').select('*').eq('project_id', params.projectId);
        if (error) throw error;
        
        return NextResponse.json(rules);
    } catch (error) { /* ... error handling ... */ }
}

// --- POST: Create a new rule for a project ---
export async function POST(req: Request, { params }: { params: { projectId: string } }) {
    try {
        const { userId } = await auth();
        if (!userId) return new Response("Unauthorized", { status: 401 });

        const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

        const { data: project } = await supabase.from('projects').select('id').eq('id', params.projectId).eq('user_id', userId).single();
        if (!project) return new Response("Project not found or access denied", { status: 404 });
        
        const { rule_type, budget_usd } = await req.json();
        if (!rule_type || budget_usd === undefined) {
            return NextResponse.json({ error: "Rule type and budget are required." }, { status: 400 });
        }

        const { data: newRule, error } = await supabase.from('per_user_rules').insert({
            project_id: params.projectId,
            rule_type,
            budget_usd
        }).select().single();

        if (error) { throw error; }

        return NextResponse.json(newRule, { status: 201 });
    } catch (error) { /* ... error handling for duplicates etc. ... */ }
}