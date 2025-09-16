// File: app/api/_lib/analytics.ts
import { createClient } from '@supabase/supabase-js';
import { ProviderAdapter } from './providers/interface';
import { calculateCost } from './cost-calculator';

// We initialize the client here once. Since this module only runs on the server, it's safe.
const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

interface AnalyticsData {
  response: Response;
  adapter: ProviderAdapter;
  projectId: string;
  latency: number;
}

export async function processAnalyticsInBackground({
  response,
  adapter,
  projectId,
  latency,
}: AnalyticsData) {
  try {
    // We must clone the response to read its body safely in the background
    const responseClone = response.clone();
    const { model, promptTokens, completionTokens } = await adapter.parseResponse(responseClone);

    // Don't log requests that had no token usage (e.g., input errors)
    if (promptTokens === 0 && completionTokens === 0) {
        return;
    }

    const cost = calculateCost({
      provider: adapter.id, model, promptTokens, completionTokens
    });

    const { error: logError } = await supabase.from('api_logs').insert({
      project_id: projectId,
      model: model,
      status_code: response.status,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      cost: cost,
      latency_ms: latency,
    });

    if (logError) {
      console.error("Error saving to api_logs:", logError.message);
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("Error in background analytics:", errorMessage);
    // In a production system, we would send this failed log to a Dead Letter Queue (DLQ)
  }
}