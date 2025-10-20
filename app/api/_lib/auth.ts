import { createClient } from '@supabase/supabase-js';
import { decryptSecret } from './encryption';
import { redis } from './redis';
import { fillSpendCacheForProject } from './cache-filler';

/**
 * Authenticates a request using the V2 "Cached SUM" architecture.
 * It is designed for maximum performance by reading spend data from a high-speed cache.
 */
export async function authenticateRequest(request: Request) {
  // We still need Supabase to get the project config
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ag-')) {
    return { isValid: false, status: 401, errorMessage: "Missing or invalid APIGuardian API Key." };
  }
  const agKey = authHeader.split(' ')[1];

  // Fetch the project configuration (keys, budgets)
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

  // --- V2 "CACHED SUM" BLOCKER LOGIC ---
  let currentSpend = 0;
  const budget = Number(project.monthly_budget);

  if (budget > 0) {
    const cacheKey = `total-spend:${project.id}`;
    
    // 1. Make one, and only one, hyper-fast call to Redis.
    const cachedSpend = await redis.get<number>(cacheKey);

    if (cachedSpend !== null) {
      // --- CACHE HIT ---
      // We have a fresh, real-time value.
      currentSpend = cachedSpend;
    } else {
      // --- CACHE MISS ---
      // The cache is empty for this project. This is a rare event.
      // We DO NOT block the user's request by doing a slow query here.
      // Instead, we allow this one request and trigger a background job to fill the cache.
      console.warn(`[Auth] Cache MISS for project ${project.id}. Triggering background refill.`);
      
      // We do not `await` this. It runs in the background.
      fillSpendCacheForProject(project.id);
      
      // For this single request, we will act as if the spend is 0.
      // The cache will be correct for the very next request.
      currentSpend = 0;
    }
  }
  // --- END OF V2 LOGIC ---
  
  const masterKey = process.env.ENCRYPTION_KEY;
  if (!masterKey) {
    return { isValid: false, status: 500, errorMessage: "Internal Server Configuration Error" };
  }
  
  const decryptedKey = decryptSecret(project.openai_api_key_encrypted, masterKey);

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