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
    .select('id, user_id, openai_api_key_encrypted, monthly_budget, per_user_budget')
    .eq('apiguardian_api_key', agKey)
    .single();

  // --- THE FIX: Use a strong guard clause at the top ---
  if (projectError || !project) {
    return { isValid: false, status: 401, errorMessage: "APIGuardian API Key not found." };
  }
  
  if (!project.openai_api_key_encrypted) {
      return { isValid: false, status: 401, errorMessage: "Provider API Key is not configured for this project." };
  }
  // --- END OF FIX ---
  // After this point, TypeScript knows for a fact that `project` is not null.

  // --- Per-User Blocker Logic ---
  const perUserBudget = Number(project.per_user_budget);
  const endUserId = request.headers.get('X-APIGuardian-User-ID');
  
  if (perUserBudget > 0 && endUserId) {
      const billingMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      
      const { data: userSpendData } = await supabase
          .from('monthly_user_spend')
          .select('total_cost')
          .eq('project_id', project.id)
          .eq('user_id', endUserId)
          .eq('billing_month', billingMonth)
          .single();

      const currentUserSpend = Number(userSpendData?.total_cost || 0);

      if (currentUserSpend >= perUserBudget) {
          return { isValid: false, status: 429, errorMessage: `Usage limit for your account has been exceeded.` };
      }
  }

  // --- Global Blocker Logic ---
  let currentSpend = 0;
  if (project.monthly_budget > 0) {
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const { data: costData, error: costError } = await supabase
      .from('api_logs')
      .select('cost')
      .eq('project_id', project.id)
      .gte('created_at', firstDayOfMonth.toISOString());
    
    if (costError) {
      return { isValid: false, status: 500, errorMessage: "Could not verify project spending." };
    }
    if(costData){
      currentSpend = costData.reduce((acc, log) => acc + Number(log.cost), 0);
    }
  }
  
  const masterKey = process.env.ENCRYPTION_KEY;
  if (!masterKey) {
    return { isValid: false, status: 500, errorMessage: "Internal Server Configuration Error" };
  }
  
  // TypeScript is now happy because it knows `project.openai_api_key_encrypted` is a string here.
  const decryptedKey = decryptSecret(
    project.openai_api_key_encrypted,
    masterKey
  );

  if (!decryptedKey) {
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