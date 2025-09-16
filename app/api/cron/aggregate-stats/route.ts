// File: app/api/cron/aggregate-stats/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  // Secure the cron job with a secret key
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
  );

  // This Supabase Edge Function will perform the aggregation.
  const { error } = await supabase.rpc('aggregate_api_logs_to_daily_stats');

  if (error) {
      console.error("Error running aggregation cron job:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}