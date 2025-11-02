import { createClient } from '@supabase/supabase-js';
import NodeCache from 'node-cache';

// Create a cache instance. Items will be stored for 10 minutes (600 seconds).
// This is a great balance between performance (hitting the cache) and freshness
// (ensuring config updates from the admin panel are picked up reasonably quickly).
const configCache = new NodeCache({ stdTTL: 600 });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// --- CONFIGURATION DATA TYPES ---

export interface ProviderConfig {
  id: string;
  name: string;
  base_url: string;
  auth_header: string;
  auth_scheme: string | null;
  message_format_style: string;
}

export interface ModelConfig {
  id: string;
  provider_id: string;
  model_name: string;
  input_cost_per_million_tokens: number;
  output_cost_per_million_tokens: number;
  prompt_tokens_key: string;
  completion_tokens_key: string;
}

export interface StrategyModel {
  id: string;
  model_name: string;
  quality_tier: string;
}

export interface StrategyConfig {
  id: string;
  strategy_logic: string;
  strategy_params: any; // Using `any` is acceptable here for maximum flexibility
  candidate_models: StrategyModel[];
}


// --- DATA FETCHING FUNCTIONS ---

/**
 * Fetches the configuration for a specific provider, with caching.
 * @param providerId The ID of the provider (e.g., 'openai')
 * @returns The provider configuration object, or null if not found.
 */
export async function getProviderConfig(providerId: string): Promise<ProviderConfig | null> {
  const cacheKey = `provider:${providerId}`;
  const cachedConfig = configCache.get<ProviderConfig>(cacheKey);

  if (cachedConfig) {
    // console.log(`[ConfigLoader] Cache HIT for provider ${cacheKey}`);
    return cachedConfig;
  }

  console.log(`[ConfigLoader] Cache MISS for provider ${cacheKey}. Fetching from DB...`);
  const { data, error } = await supabase
    .from('providers')
    .select('*')
    .eq('id', providerId)
    .single();

  if (error || !data) {
    if(error) console.error(`Error fetching provider config for ${providerId}:`, error.message);
    return null;
  }
  
  configCache.set(cacheKey, data);
  return data;
}
    
/**
 * Fetches the configuration for a specific model, with caching.
 * @param providerId The ID of the provider (e.g., 'openai')
 * @param modelName The name of the model (e.g., 'gpt-4-turbo')
 * @returns The model configuration object, or null if not found.
 */
export async function getModelConfig(providerId: string, modelName: string): Promise<ModelConfig | null> {
  const cacheKey = `model:${providerId}:${modelName}`;
  const cachedConfig = configCache.get<ModelConfig>(cacheKey);

  if (cachedConfig) {
    // console.log(`[ConfigLoader] Cache HIT for model ${cacheKey}`);
    return cachedConfig;
  }

  console.log(`[ConfigLoader] Cache MISS for model ${cacheKey}. Fetching from DB...`);
  const { data, error } = await supabase
    .from('models')
    .select('*')
    .eq('provider_id', providerId)
    .eq('model_name', modelName)
    .single();

  if (error || !data) {
    if(error) console.error(`Error fetching model config for ${modelName}:`, error.message);
    return null;
  }
  
  configCache.set(cacheKey, data);
  return data;
}

/**
 * Fetches a routing strategy's configuration from the database, with caching.
 * @param providerId The provider the strategy belongs to (e.g., 'openai').
 * @param virtualModelName The name of the virtual model (e.g., '@auto').
 * @returns The strategy configuration object, or null if not found.
 */
export async function getStrategyConfig(providerId: string, virtualModelName: string): Promise<StrategyConfig | null> {
  const cacheKey = `strategy:${providerId}:${virtualModelName}`;
  const cachedConfig = configCache.get<StrategyConfig>(cacheKey);
  if (cachedConfig) {
    console.log(`[ConfigLoader] Cache HIT for strategy ${cacheKey}`);
    return cachedConfig;
  }

  console.log(`[ConfigLoader] Cache MISS for strategy ${cacheKey}. Fetching from DB...`);
  // This is a complex query that joins strategies with their candidate models.
  const { data, error } = await supabase
    .from('routing_strategies')
    .select(`
      id,
      strategy_logic,
      strategy_params,
      candidate_models:strategy_models (
        model:models ( id, model_name, quality_tier )
      )
    `)
    .eq('provider_id', providerId)
    .eq('virtual_model_name', virtualModelName)
    .single();
    
  if (error || !data) {
    if(error) console.error(`Error fetching strategy ${virtualModelName}:`, error.message);
    return null;
  }
  
  // The query returns a nested structure. We flatten it for easier use.
  const flattenedData: StrategyConfig = {
    ...data,
    candidate_models: data.candidate_models.map((cm: any) => cm.model).filter(Boolean)
  };

  configCache.set(cacheKey, flattenedData);
  return flattenedData;
}