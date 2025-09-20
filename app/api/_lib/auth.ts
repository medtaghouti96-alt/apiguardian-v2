// File: app/api/_lib/auth.ts
import { createClient } from '@supabase/supabase-js';
import { decryptSecret } from './encryption';

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

  // --- NEW LOGIC STARTS HERE ---
  let currentSpend = 0;
  if (project.monthly_budget > 0) {
    // Get the start of the current month in UTC
    const today = new Date();
    const firstDayOfMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));

    // Fetch and sum the stats for this project for the current month
    const { data: stats, error: statsError } = await supabase
      .from('daily_project_stats')
      .select('total_cost')
      .eq('project_id', project.id)
      .gte('log_date', firstDayOfMonth.toISOString().split('T')[0]);
    
    if (statsError) {
        console.error(`Error fetching stats for project ${project.id}:`, statsError);
        // Fail safely - if we can't get the stats, we should probably block the request to be safe
        return { isValid: false, status: 500, errorMessage: "Could not verify project spending." };
    }
    
    // Sum up the daily costs to get the month-to-date total
    currentSpend = stats.reduce((acc, day) => acc + Number(day.total_cost), 0);
  }
  // --- END OF NEW LOGIC ---

  const masterKey = process.env.ENCRYPTION_KEY;
  if (!masterKey) {
    console.error("CRITICAL: ENCRYPTION_KEY is not set on the server.");
    return { isValid: false, status: 500, errorMessage: "Internal Server Configuration Error" };
  }

  const decryptedKey = decryptSecret(
    project.openai_api_key_encrypted,
    masterKey
  );

  if (!decryptedKey) {
    console.error(`CRITICAL: Failed to decrypt secret for project: ${project.id}.`);
    return { isValid: false, status: 500, errorMessage: "Internal Security Error" };
  }

  // --- MODIFIED RETURN OBJECT ---
  // We now include the fetched spending data in the successful result.
  return {
    isValid: true,
    status: 200,
    project: {
      id: project.id,
      user_id: project.user_id,
      monthly_budget: project.monthly_budget,
    },
    decryptedKey: decryptedKey,
    currentSpend: currentSpend, // <-- NEW
  };
}