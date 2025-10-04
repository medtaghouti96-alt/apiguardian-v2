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

export async function processAnalyticsInBackground({
  response,
  adapter,
  projectId,
  userId,
  latency,
}: AnalyticsData) {
  console.log(`[Analytics] START: Processing analytics for project ${projectId}`);
  try {
    const responseClone = response.clone();
    const { model, promptTokens, completionTokens } = await adapter.parseResponse(responseClone);
    console.log(`[Analytics] Parsed response. Model: ${model}, Tokens: ${promptTokens}/${completionTokens}`);

    if (promptTokens === 0 && completionTokens === 0) {
        console.log("[Analytics] END: No token usage detected. Exiting.");
        return;
    }

    const cost = calculateCost({
      provider: adapter.id,
      model,
      promptTokens,
      completionTokens
    });
    console.log(`[Analytics] Calculated cost: $${cost}`);

    const logPayload = {
      project_id: projectId,
      user_id: userId,
      model: model,
      status_code: response.status,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      cost: cost,
      latency_ms: latency,
    };

    console.log("[Analytics] Attempting to insert log into Supabase...");
    const { error: logError } = await supabase.from('api_logs').insert(logPayload);

    if (logError) {
      console.error(`[Analytics] FAILED to insert log for project ${projectId}.`);
      console.error(`[Analytics] Supabase Error Code: ${logError.code}`);
      console.error(`[Analytics] Supabase Error Message: ${logError.message}`);
      console.error(`[Analytics] Payload sent to Supabase: ${JSON.stringify(logPayload)}`);
      console.log("[Analytics] END: Exiting due to database error.");
      return;
    }

    console.log(`[Analytics] Successfully inserted log. Now calling notifier for project ${projectId}.`);
    
    // Call the notifier (we are not awaiting it)
    checkBudgetAndSendNotification(projectId);

    console.log("[Analytics] END: Notifier has been triggered.");

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("[Analytics] CRITICAL: An unexpected error occurred in the try/catch block:", errorMessage);
  }
}