import { createClient } from '@supabase/supabase-js';
import { ProviderAdapter } from './providers/interface';
import { calculateCost } from './cost-calculator';
import { checkBudgetAndSendNotification } from './notifier';

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
  response, adapter, projectId, userId, endUserId, latency,
}: AnalyticsData) {
  try {
    const responseClone = response.clone();
    const { model, promptTokens, completionTokens } = await adapter.parseResponse(responseClone);

    if (promptTokens === 0 && completionTokens === 0) return;

    const cost = await calculateCost({ provider: adapter.id, model, promptTokens, completionTokens });
    
    // 1. Insert the raw log, now including the end_user_id
    await supabase.from('api_logs').insert({
      project_id: projectId,
      user_id: userId,
      end_user_id: endUserId,
      model: model,
      status_code: response.status,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      cost: cost,
      latency_ms: latency,
    });

    // 2. If an end-user ID was provided, increment their monthly spend
    if (endUserId) {
        const billingMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
        
        const { error: rpcError } = await supabase.rpc('increment_user_spend', {
            p_project_id: projectId,
            p_user_id: endUserId,
            p_billing_month: billingMonth,
            p_cost_to_add: cost
        });
        if(rpcError) console.error("Error in increment_user_spend RPC:", rpcError.message);
    }

    // 3. Trigger the global project budget notifier
    checkBudgetAndSendNotification(projectId);

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("Critical error in background analytics:", errorMessage);
  }
}