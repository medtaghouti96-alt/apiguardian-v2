import { createClient } from '@supabase/supabase-js';
import { ProviderAdapter } from './providers/interface';
import { calculateCost } from './cost-calculator';

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

// --- THE FIX: Add userId to the interface ---
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
  userId, // De-structure the new property
  latency,
}: AnalyticsData) {
  try {
    const responseClone = response.clone();
    const { model, promptTokens, completionTokens } = await adapter.parseResponse(responseClone);

    if (promptTokens === 0 && completionTokens === 0) {
        return;
    }

    const cost = calculateCost({
      provider: adapter.id, model, promptTokens, completionTokens
    });

    // --- THE FIX: Add user_id to the database insert ---
    const { error: logError } = await supabase.from('api_logs').insert({
      project_id: projectId,
      user_id: userId, // Save the ID of the user who owns the project
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
  }
}