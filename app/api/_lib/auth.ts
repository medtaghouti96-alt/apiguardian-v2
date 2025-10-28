import { createClient } from '@supabase/supabase-js';
import { decryptSecret } from './encryption';
import { redis } from './redis';
import { fillSpendCacheForProject } from './cache-filler';

/**
 * This is the final, production-ready authentication function for the V2 Engine.
 * It uses the "Cached SUM" architecture for the global budget and includes
 * the "Tier-Based" per-user budget blocker.
 */
export async function authenticateRequest(request: Request) {
  // Initialize the Supabase client for this function's scope.
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // 1. Authenticate the APIGuardian Key from the header.
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ag-')) {
    return { isValid: false, status: 401, errorMessage: "Missing or invalid APIGuardian API Key." };
  }
  const agKey = authHeader.split(' ')[1];

  // 2. Fetch the corresponding Project from the database.
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, user_id, openai_api_key_encrypted, monthly_budget') // This should be per_user_rules
    .eq('apiguardian_api_key', agKey)
    .single();

  if (projectError || !project) {
    // This is the error you are currently seeing.
    return { isValid: false, status: 401, errorMessage: "APIGuardian API Key not found." };
  }
  
  if (!project.openai_api_key_encrypted) {
    return { isValid: false, status: 401, errorMessage: "Provider API Key is not configured for this project." };
  }

  // --- 3. TIER-BASED PER-USER BUDGET CHECK ---
  const endUserId = request.headers.get('x-apiguardian-user-id');
  if (endUserId) {
      const { data: rules } = await supabase.from('per_user_rules').select('rule_type, budget_usd').eq('project_id', project.id);
      if (rules && rules.length > 0) {
          const userTier = request.headers.get('x-apiguardian-user-tier') || 'default';
          const applicableRule = rules.find(r => r.rule_type === userTier) || rules.find(r => r.rule_type === 'default');
          if (applicableRule) {
              const budgetForThisUser = Number(applicableRule.budget_usd);
              const billingMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
              const { data: userSpendData } = await supabase.from('monthly_user_spend').select('total_cost')
                  .eq('project_id', project.id).eq('user_id', endUserId).eq('billing_month', billingMonth).single();
              const currentUserSpend = Number(userSpendData?.total_cost || 0);
              if (currentUserSpend >= budgetForThisUser) {
                  return { isValid: false, status: 429, errorMessage: `Usage limit for your '${userTier}' plan has been exceeded.` };
              }
          }
      }
  }

  // --- 4. GLOBAL PROJECT BUDGET CHECK (V2 Cached SUM) ---
  let currentSpend = 0;
  const budget = Number(project.monthly_budget);
  if (budget > 0) {
    const cacheKey = `total-spend:${project.id}`;
    const cachedSpend = await redis.get<number>(cacheKey);
    if (cachedSpend !== null) {
      currentSpend = cachedSpend;
    } else {
      console.warn(`[Auth] Cache MISS for project ${project.id}. Triggering background refill.`);
      fillSpendCacheForProject(project.id);
      currentSpend = 0; 
    }
  }
  
  // 5. Decrypt the Provider Key
  const masterKey = process.env.ENCRYPTION_KEY;
  if (!masterKey) {
    return { isValid: false, status: 500, errorMessage: "Internal Server Configuration Error" };
  }
  
  const decryptedKey = decryptSecret(project.openai_api_key_encrypted, masterKey);
  if (!decryptedKey) {
    return { isValid: false, status: 500, errorMessage: "Internal Security Error" };
  }

  // 6. Return all data needed by the proxy handler
  return {
    isValid: true,
    status: 200,
    project, // This is the full project object
    decryptedKey,
    currentSpend,
  };
}