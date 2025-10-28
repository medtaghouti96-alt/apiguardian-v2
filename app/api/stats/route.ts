// File: app/api/stats/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return new Response("Unauthorized", { status: 401 });

    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
    
    const { data: projects, error: projectsError } = await supabase
      .from('projects').select('id').eq('user_id', userId);
    
    if (projectsError) throw projectsError;
    if (!projects || projects.length === 0) {
        return NextResponse.json({ total_cost: 0, total_requests: 0 });
    }
    
    const projectIds = projects.map(p => p.id);
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    // --- THE SIMPLE FIX: Perform a SUM() query here ---
    // This is acceptable for a dashboard page load.
    const { data, error, count } = await supabase
      .from('api_logs')
      .select('cost', { count: 'exact' })
      .in('project_id', projectIds)
      .gte('created_at', firstDayOfMonth.toISOString());

    if (error) throw error;

    const total_cost = data.reduce((acc, log) => acc + Number(log.cost), 0);
    const total_requests = count || 0;
    
    return NextResponse.json({ total_cost, total_requests });

  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json({ error: "Could not fetch stats." }, { status: 500 });
  }
}