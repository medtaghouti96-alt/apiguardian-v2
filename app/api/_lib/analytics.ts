import { createClient } from '@supabase/supabase-js';
import { ProviderAdapter } from './providers/interface';
import { calculateCost } from './cost-calculator';
import { checkBudgetAndSendNotification } from './notifier';
import { redis } from './redis';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
interface AnalyticsData {
  response: Response; adapter: ProviderAdapter; projectId: string; userId: string; endUserId: string | null; latency: number;
}
export async function processAnalyticsInBackground({ response, adapter, projectId, userId, endUserId, latency }: AnalyticsData) {
  try {
    const responseClone = response.clone();
    const { model, promptTokens, completionTokens } = await adapter.parseResponse(responseClone);
    if (promptTokens === 0 && completionTokens === 0) return;
    const cost = await calculateCost({ provider: adapter.id, model, promptTokens, completionTokens });
    
    await supabase.from('api_logs').insert({
        project_id: projectId, user_id: userId, end_user_id: endUserId, model,
        status_code: response.status, prompt_tokens: promptTokens,
        completion_tokens: completionTokens, cost, latency_ms: latency,
    });

    if (endUserId) {
      const billingMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      await supabase.rpc('increment_user_spend', {
          p_project_id: projectId, p_user_id: endUserId, p_billing_month: billingMonth, p_cost_to_add: cost
      });
    }

    let newTotalSpend = 0;
    if (cost > 0) {
        const cacheKey = `total-spend:${projectId}`;
        newTotalSpend = await redis.incrbyfloat(cacheKey, cost);
        await redis.expire(cacheKey, 600); // 10 minute TTL
    }

    if (newTotalSpend > 0) {
        checkBudgetAndSendNotification(projectId, newTotalSpend);
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("Critical error in background analytics:", errorMessage);
  }
}