import { createClient } from '@supabase/supabase-js';
import { decryptSecret } from './encryption';

/**
 * Authenticates a request. For budget checks, this function uses the FAST but
 * slightly delayed `daily_project_stats` table to ensure the proxy remains low-latency.
 */
export async function authenticateRequest(request: Request) {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ag-')) {
    return { isValid: false, status: 401, errorMessage: "Missing or invalid APIGuardian API Key." };
  }
  const agKey = authHeader.split(' ')[1];

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, user_id, openai_api_key_encrypted, monthly_budget')
    .eq('apiguardian_api_key', agKey)
    .single();

  if (projectError || !project) {
    return { isValid: false, status: 401, errorMessage: "APIGuardian API Key not found." };
  }
  
  if (!project.openai_api_key_encrypted) {
    return { isValid: false, status: 401, errorMessage: "Provider API Key is not configured for this project." };
  }

  let currentSpend = 0;
  if (project.monthly_budget > 0) {
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    
    // This is the FAST query on the pre-aggregated table.
    const { data: stats, error: statsError } = await supabase
      .from('daily_project_stats')
      .select('total_cost')
      .eq('project_id', project.id)
      .gte('log_date', firstDayOfMonth.toISOString().split('T')[0]);
    
    if (statsError) {
      console.error(`Auth error (fetching stats):`, statsError.message);
      return { isValid: false, status: 500, errorMessage: "Could not verify project spending." };
    }

    currentSpend = stats.reduce((acc, day) => acc + Number(day.total_cost), 0);
  }

  const masterKey = process.env.ENCRYPTION_KEY;
  if (!masterKey) {
    console.error("CRITICAL: ENCRYPTION_KEY is not set.");
    return { isValid: false, status: 500, errorMessage: "Internal Server Configuration Error" };
  }

  const decryptedKey = decryptSecret(project.openai_api_key_encrypted, masterKey);

  if (!decryptedKey) {
    console.error(`CRITICAL: Failed to decrypt secret for project: ${project.id}.`);
    return { isValid: false, status: 500, errorMessage: "Internal Security Error" };
  }

  return {
    isValid: true,
    status: 200,
    project: project,
    decryptedKey: decryptedKey,
    currentSpend: currentSpend,
  };
}