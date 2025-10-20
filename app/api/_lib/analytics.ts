import { createClient } from '@supabase/supabase-js';
import { ProviderAdapter } from './providers/interface';
import { calculateCost } from './cost-calculator';
import { checkBudgetAndSendNotification } from './notifier';
import { redis } from './redis';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

interface AnalyticsData {
  response: Response;
  adapter: ProviderAdapter;
  projectId: string;
  userId: string;
  endUserId: string | null;
  latency: number;
}

export async function processAnalyticsInBackground({
  response, adapter, projectId, userId, endUserId, latency
}: AnalyticsData) {
  try {
    const responseClone = response.clone();
    const { model, promptTokens, completionTokens } = await adapter.parseResponse(responseClone);

    if (promptTokens === 0 && completionTokens === 0) return;

    const cost = await calculateCost({ provider: adapter.id, model, promptTokens, completionTokens });
    
    // 1. Log the full request to Postgres (our "hard drive")
    await supabase.from('api_logs').insert({
        project_id: projectId, user_id: userId, end_user_id: endUserId, model: model,
        status_code: response.status, prompt_tokens: promptTokens,
        completion_tokens: completionTokens, cost: cost, latency_ms: latency,
    });

    let newTotalSpend = 0;
    // 2. Update the Redis cache (our "RAM")
    if (cost > 0) {
        const cacheKey = `total-spend:${projectId}`;
        // Atomically increment the spend and get the new total.
        newTotalSpend = await redis.incrbyfloat(cacheKey, cost);
        // Reset the expiration on every write to keep the key alive.
        await redis.expire(cacheKey, 600); // 10 minute expiry
    }

    // 3. Trigger the notifier, passing the 100% accurate new total from Redis.
    if (newTotalSpend > 0) {
        checkBudgetAndSendNotification(projectId, newTotalSpend);
    }

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("Critical error in background analytics:", errorMessage);
  }
}