import { createClient } from '@supabase/supabase-js';
import NodeCache from 'node-cache';

const configCache = new NodeCache({ stdTTL: 600 });
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// --- CONFIGURATION DATA TYPES (FULLY TYPED) ---

export interface ProviderConfig {
  id: string; name: string; base_url: string; auth_header: string; auth_scheme: string | null; message_format_style: string;
}
export interface ModelConfig {
  id: string; provider_id: string; model_name: string; input_cost_per_million_tokens: number; output_cost_per_million_tokens: number;
}

interface StrategyParams {
  threshold?: number;
  low_tier_quality?: string;
  high_tier_quality?: string;
}

export interface StrategyModel { id: string; model_name: string; quality_tier: string; }
export interface StrategyConfig {
  id: string;
  strategy_logic: string;
  strategy_params: StrategyParams;
  candidate_models: StrategyModel[];
}

// --- DATA FETCHING FUNCTIONS ---

export async function getProviderConfig(providerId: string): Promise<ProviderConfig | null> {
  const cacheKey = `provider:${providerId}`;
  const cachedConfig = configCache.get<ProviderConfig>(cacheKey);
  if (cachedConfig) return cachedConfig;

  const { data, error } = await supabase.from('providers').select('*').eq('id', providerId).single();
  if (error || !data) return null;
  
  configCache.set(cacheKey, data);
  return data;
}
    
export async function getModelConfig(providerId: string, modelName: string): Promise<ModelConfig | null> {
  const cacheKey = `model:${providerId}:${modelName}`;
  const cachedConfig = configCache.get<ModelConfig>(cacheKey);
  if (cachedConfig) return cachedConfig;

  const { data, error } = await supabase.from('models').select('*').eq('provider_id', providerId).eq('model_name', modelName).single();
  if (error || !data) return null;
  
  configCache.set(cacheKey, data);
  return data;
}

/**
 * Fetches a routing strategy's configuration using a series of simple queries.
 * This is a robust and type-safe method.
 */
export async function getStrategyConfig(providerId: string, virtualModelName: string): Promise<StrategyConfig | null> {
  const cacheKey = `strategy:${providerId}:${virtualModelName}`;
  const cachedConfig = configCache.get<StrategyConfig>(cacheKey);
  if (cachedConfig) {
    console.log(`[ConfigLoader] Cache HIT for strategy ${cacheKey}`);
    return cachedConfig;
  }
  console.log(`[ConfigLoader] Cache MISS for strategy ${cacheKey}. Fetching from DB...`);
  
  try {
    // Step 1: Fetch the core strategy data
    const { data: strategyData, error: strategyError } = await supabase
      .from('routing_strategies')
      .select('*')
      .eq('provider_id', providerId)
      .eq('virtual_model_name', virtualModelName)
      .single();
      
    if (strategyError || !strategyData) {
      if(strategyError) console.error(`Error fetching strategy:`, strategyError.message);
      return null;
    }

    // Step 2: Fetch the IDs of the models linked to this strategy
    const { data: links, error: linksError } = await supabase
      .from('strategy_models')
      .select('model_id')
      .eq('strategy_id', strategyData.id);
    
    if (linksError) {
        console.error(`Error fetching strategy model links:`, linksError.message);
        return null;
    }
    if (!links || links.length === 0) {
        // A strategy with no candidate models is valid but empty
        return { ...strategyData, candidate_models: [] };
    }

    const modelIds = links.map(l => l.model_id);

    // Step 3: Fetch the full details for those specific models
    const { data: models, error: modelsError } = await supabase
      .from('models')
      .select('id, model_name, quality_tier')
      .in('id', modelIds);
      
    if (modelsError || !models) {
        console.error(`Error fetching candidate models:`, modelsError?.message);
        return null;
    }

    // Assemble the final, complete configuration object
    const finalData: StrategyConfig = {
      id: strategyData.id,
      strategy_logic: strategyData.strategy_logic,
      strategy_params: strategyData.strategy_params,
      candidate_models: models,
    };

    configCache.set(cacheKey, finalData);
    return finalData;

  } catch(e) {
    console.error("Unexpected error in getStrategyConfig:", e);
    return null;
  }
}