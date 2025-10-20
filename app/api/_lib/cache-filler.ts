// File: app/api/_lib/cache-filler.ts
import { createClient } from '@supabase/supabase-js';
import { redis } from './redis';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

/**
 * This is a background job. It performs the "expensive" SUM() query on the main
 * database and then saves the result to the Redis cache with a 60-second TTL.
 * @param projectId The ID of the project whose cache needs to be filled.
 */
export async function fillSpendCacheForProject(projectId: string) {
  console.log(`[CacheFiller] START: Cache miss for project ${projectId}. Refilling cache...`);
  try {
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    
    const { data: costData, error: costError } = await supabase
      .from('api_logs')
      .select('cost')
      .eq('project_id', projectId)
      .gte('created_at', firstDayOfMonth.toISOString());

    if (costError) throw costError;

    const currentSpend = costData?.reduce((acc, log) => acc + Number(log.cost), 0) || 0;

    // Set the authoritative value in the cache with a 60-second expiration
    await redis.set(`total-spend:${projectId}`, currentSpend, { ex: 60 });
    
    console.log(`[CacheFiller] END: Cache refilled for project ${projectId} with value: $${currentSpend}`);
  } catch (error) {
    console.error(`[CacheFiller] CRITICAL: Failed to refill cache for project ${projectId}`, error);
  }
}