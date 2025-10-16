import { NextResponse, NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

function getProjectId(req: NextRequest): string | undefined {
    // Helper to reliably get the projectId from the URL, e.g., /api/projects/{projectId}/rules
    const parts = req.nextUrl.pathname.split('/');
    const projectsIndex = parts.indexOf('projects');
    return parts[projectsIndex + 1];
}

// --- GET: Fetch all rules for a project ---
export async function GET(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) return new Response("Unauthorized", { status: 401 });
        
        const projectId = getProjectId(req);
        if (!projectId) return NextResponse.json({ error: "Project ID missing from URL." }, { status: 400 });

        const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
        
        const { data: project } = await supabase.from('projects').select('id').eq('id', projectId).eq('user_id', userId).single();
        if (!project) return new Response("Project not found or access denied", { status: 404 });
        
        const { data: rules, error } = await supabase.from('per_user_rules').select('*').eq('project_id', projectId);
        if (error) throw error;
        
        return NextResponse.json(rules);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("Error fetching user rules:", errorMessage);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// --- POST: Create a new rule for a project ---
export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) return new Response("Unauthorized", { status: 401 });

        const projectId = getProjectId(req);
        if (!projectId) return NextResponse.json({ error: "Project ID missing from URL." }, { status: 400 });

        const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

        const { data: project } = await supabase.from('projects').select('id').eq('id', projectId).eq('user_id', userId).single();
        if (!project) return new Response("Project not found or access denied", { status: 404 });
        
        const { rule_type, budget_usd } = await req.json();
        if (!rule_type || budget_usd === undefined) {
            return NextResponse.json({ error: "Rule type and budget are required." }, { status: 400 });
        }

        const { data: newRule, error } = await supabase.from('per_user_rules').insert({
            project_id: projectId,
            rule_type,
            budget_usd
        }).select().single();

        if (error) { throw error; }

        return NextResponse.json(newRule, { status: 201 });
    } catch (error) {
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
            return NextResponse.json({ error: `A rule for this 'rule_type' already exists.` }, { status: 409 });
        }
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error("Error creating user rule:", errorMessage);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}