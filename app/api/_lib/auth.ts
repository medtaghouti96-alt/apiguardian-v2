import { createClient } from '@supabase/supabase-js';
import { decryptSecret } from './encryption';
import { redis } from './redis';
import { fillSpendCacheForProject } from './cache-filler';

export async function authenticateRequest(request: Request) {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ag-')) {
    return { isValid: false, status: 401, errorMessage: "Missing or invalid APIGuardian API Key." };
  }
  const agKey = authHeader.split(' ')[1];

  const { data: project, error: projectError } = await supabase.from('projects')
    .select('id, user_id, openai_api_key_encrypted, monthly_budget, per_user_budget').eq('apiguardian_api_key', agKey).single();

  if (projectError || !project) {
    return { isValid: false, status: 401, errorMessage: "APIGuardian API Key not found." };
  }
  if (!project.openai_api_key_encrypted) {
    return { isValid: false, status: 401, errorMessage: "Provider API Key is not configured for this project." };
  }

  // --- V2 Per-User Blocker ---
  const perUserBudget = Number(project.per_user_budget);
  const endUserId = request.headers.get('x-apiguardian-user-id');
  if (perUserBudget > 0 && endUserId) {
    const billingMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const { data: userSpendData } = await supabase.from('monthly_user_spend').select('total_cost')
      .eq('project_id', project.id).eq('user_id', endUserId).eq('billing_month', billingMonth).single();
    const currentUserSpend = Number(userSpendData?.total_cost || 0);
    if (currentUserSpend >= perUserBudget) {
      return { isValid: false, status: 429, errorMessage: `Usage limit for your account has been exceeded.` };
    }
  }

  // --- V2 Global Blocker (Cached SUM) ---
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

  const masterKey = process.env.ENCRYPTION_KEY;
  if (!masterKey) {
    return { isValid: false, status: 500, errorMessage: "Internal Server Configuration Error" };
  }
  const decryptedKey = decryptSecret(project.openai_api_key_encrypted, masterKey);
  if (!decryptedKey) {
    return { isValid: false, status: 500, errorMessage: "Internal Security Error" };
  }

  return { isValid: true, project, decryptedKey, currentSpend };
}