// File: app/api/_lib/analytics.ts
import { createClient } from '@supabase/supabase-js';
import { ProviderAdapter } from './providers/interface';
import { calculateCost } from './cost-calculator';
import { checkBudgetAndSendNotification } from './notifier';

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

interface AnalyticsData {
  response: Response;
  adapter: ProviderAdapter;
  projectId: string;
  userId: string;
  latency: number;
}

/**
 * Runs in the background after a request is completed.
 * Its only jobs are to log the request details and then trigger the notifier.
 */
export async function processAnalyticsInBackground({
  response,
  adapter,
  projectId,
  userId,
  latency,
}: AnalyticsData) {
  try {
    const responseClone = response.clone();
    const { model, promptTokens, completionTokens } = await adapter.parseResponse(responseClone);

    if (promptTokens === 0 && completionTokens === 0) {
        return;
    }

    const cost = calculateCost({
      provider: adapter.id,
      model,
      promptTokens,
      completionTokens
    });

    // 1. Insert the detailed log for the request.
    const { error: logError } = await supabase.from('api_logs').insert({
      project_id: projectId,
      user_id: userId,
      model: model,
      status_code: response.status,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      cost: cost,
      latency_ms: latency,
    });

    if (logError) {
      console.error("Error saving to api_logs:", logError.message);
      return; // Stop if logging fails.
    }

    // 2. Trigger the notification system.
    //    We do not await this. It runs completely in the background.
    //    We only pass the projectId, as the notifier is responsible for all calculations.
    checkBudgetAndSendNotification(projectId);

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("Critical error in background analytics:", errorMessage);
  }
}