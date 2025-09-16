// File: app/api/logs/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

// Use the Node.js runtime for Supabase admin client
export const runtime = 'nodejs';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    
    // Fetch the projects belonging to this user to get their project IDs
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id')
      .eq('user_id', userId);

    if (projectsError) throw projectsError;
    if (!projects || projects.length === 0) {
      // If the user has no projects, return an empty array.
      return NextResponse.json([]);
    }
    
    const projectIds = projects.map(p => p.id);

    // Fetch the 50 most recent logs for any of the user's projects
    const { data: logs, error: logsError } = await supabase
      .from('api_logs')
      .select('id, created_at, model, status_code, cost, latency_ms')
      .in('project_id', projectIds)
      .limit(50)
      .order('created_at', { ascending: false });

    if (logsError) throw logsError;

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Error fetching logs:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}