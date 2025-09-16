// File: app/api/stats/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return new Response("Unauthorized", { status: 401 });

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    const { data: projects, error: projectsError } = await supabase
      .from('projects').select('id').eq('user_id', userId);
    if (projectsError) throw projectsError;
    if (!projects || projects.length === 0) {
        return NextResponse.json({ total_cost: 0, total_requests: 0 });
    }
    
    const projectIds = projects.map(p => p.id);

    // Get the start of the current month in UTC
    const today = new Date();
    const firstDayOfMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));

    // Fetch and sum the stats for all of the user's projects for the current month
    const { data: stats, error: statsError } = await supabase
      .from('daily_project_stats')
      .select('total_cost, total_requests')
      .in('project_id', projectIds)
      .gte('log_date', firstDayOfMonth.toISOString().split('T')[0]);

    if (statsError) throw statsError;

    // Calculate the totals
    const monthlyTotals = stats.reduce(
        (acc, current) => {
            acc.total_cost += Number(current.total_cost);
            acc.total_requests += Number(current.total_requests);
            return acc;
        },
        { total_cost: 0, total_requests: 0 }
    );

    return NextResponse.json(monthlyTotals);
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json({ error: "Could not fetch stats." }, { status: 500 });
  }
}