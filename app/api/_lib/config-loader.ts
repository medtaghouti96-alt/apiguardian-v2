// File: app/api/_lib/config-loader.ts
import { createClient } from '@supabase/supabase-js';
import NodeCache from 'node-cache';

// Cache items for 10 minutes for high performance
const configCache = new NodeCache({ stdTTL: 600 });
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

// Define types for our configuration data
export interface ProviderConfig {
  id: string; name: string; base_url: string; auth_header: string; auth_scheme: string | null; message_format_style: string;
}
export interface ModelConfig {
  id: string; provider_id: string; model_name: string; input_cost_per_million_tokens: number; output_cost_per_million_tokens: number;
}

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