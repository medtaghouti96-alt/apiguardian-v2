import { createClient } from '@supabase/supabase-js';
import { decryptSecret } from './encryption';

/**
 * Authenticates a request. This is the "Smart Blocker v2".
 * It performs both the new Tier-Based Per-User budget check and the original
 * Global budget check.
 */
export async function authenticateRequest(request: Request) {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // 1. Authenticate the APIGuardian Key
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ag-')) {
    return { isValid: false, status: 401, errorMessage: "Missing or invalid APIGuardian API Key." };
  }
  const agKey = authHeader.split(' ')[1];

  // 2. Fetch the Project data
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, user_id, openai_api_key_encrypted, monthly_budget') // We no longer need `per_user_budget` from here
    .eq('apiguardian_api_key', agKey)
    .single();

  if (projectError || !project) {
    return { isValid: false, status: 401, errorMessage: "APIGuardian API Key not found." };
  }
  
  if (!project.openai_api_key_encrypted) {
    return { isValid: false, status: 401, errorMessage: "Provider API Key is not configured for this project." };
  }

  // --- 3. TIER-BASED PER-USER BUDGET CHECK (Smart Blocker v2) ---
  const endUserId = request.headers.get('x-apiguardian-user-id');
  
  if (endUserId) {
      // Fetch all rules for this project in one efficient query
      const { data: rules, error: rulesError } = await supabase
          .from('per_user_rules')
          .select('rule_type, budget_usd')
          .eq('project_id', project.id);
      
      if (rulesError) {
          console.error(`Per-user auth error (fetching rules):`, rulesError.message);
          return { isValid: false, status: 500, errorMessage: `Could not verify usage rules.` };
      }
      
      if (rules && rules.length > 0) {
          // Determine the user's tier from the header, defaulting to 'default'
          const userTier = request.headers.get('X-APIGuardian-User-Tier') || 'default';

          // Find the most specific rule that applies to this user
          const applicableRule = rules.find(r => r.rule_type === userTier) || rules.find(r => r.rule_type === 'default');

          if (applicableRule) {
              const budgetForThisUser = Number(applicableRule.budget_usd);
              
              // Fetch this specific user's current spend from the aggregated table
              const billingMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
              const { data: userSpendData } = await supabase
                  .from('monthly_user_spend')
                  .select('total_cost')
                  .eq('project_id', project.id)
                  .eq('user_id', endUserId)
                  .eq('billing_month', billingMonth)
                  .single();

              const currentUserSpend = Number(userSpendData?.total_cost || 0);

              // Enforce the rule
              if (currentUserSpend >= budgetForThisUser) {
                  console.log(`Blocking user ${endUserId} (Tier: ${userTier}) for project ${project.id}. Spend: ${currentUserSpend}, Budget: ${budgetForThisUser}`);
                  return { isValid: false, status: 429, errorMessage: `Usage limit for your '${userTier}' plan has been exceeded.` };
              }
          }
      }
  }

  // --- 4. GLOBAL PROJECT BUDGET CHECK ---
  // This still runs if the per-user check passes. It uses the accurate, real-time SUM() on api_logs.
  let currentGlobalSpend = 0;
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
      currentGlobalSpend = costData.reduce((acc, log) => acc + Number(log.cost), 0);
    }
  }
  
  // 5. Decrypt the Provider Key
  const masterKey = process.env.ENCRYPTION_KEY;
  if (!masterKey) {
    return { isValid: false, status: 500, errorMessage: "Internal Server Configuration Error" };
  }
  
  const decryptedKey = decryptSecret(
    project.openai_api_key_encrypted,
    masterKey
  );

  if (!decryptedKey) {
    return { isValid: false, status: 500, errorMessage: "Internal Security Error" };
  }

  // 6. Return all data needed by the proxy handler
  return {
    isValid: true,
    status: 200,
    project: project,
    decryptedKey: decryptedKey,
    currentSpend: currentGlobalSpend, // The global spend is still passed for the main blocker
  };
}