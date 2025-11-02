import { ProviderAdapter, ProviderRequestData } from './interface';
import { ProviderConfig, getStrategyConfig } from '../config-loader';

// A simple helper to estimate token count from messages
function estimateTokens(messages: any[]): number {
    if (!messages || !Array.isArray(messages)) return 0;
    const fullPrompt = messages.map(m => m.content || '').join('\n');
    return fullPrompt.length / 4;
}

export class DynamicAdapter implements ProviderAdapter {
  public id: string;
  private config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.id = config.id;
    this.config = config;
  }

  // The `transformRequest` function is now async to handle fetching the strategy
  async transformRequest(decryptedApiKey: string, requestBody: Record<string, unknown>, slug: string[]): Promise<ProviderRequestData> {
    let modelToUse = requestBody.model as string;
    
    // --- THE UNIVERSAL SMART ROUTING LOGIC ---
    if (modelToUse && modelToUse.startsWith('@')) {
        console.log(`[Smart Routing] Virtual model '${modelToUse}' detected for provider '${this.id}'.`);
        
        const strategy = await getStrategyConfig(this.id, modelToUse);
        if (!strategy) {
            throw new Error(`Smart strategy '${modelToUse}' not found for provider '${this.id}'.`);
        }

        // --- THE STRATEGY ENGINE ---
        let chosenModelName: string | undefined = undefined;

        if (strategy.strategy_logic === 'quality_threshold') {
            const estimatedTokens = estimateTokens(requestBody.messages as any[]);
            
            const highTierModel = strategy.candidate_models.find(m => m.quality_tier === strategy.strategy_params.high_tier_quality);
            const lowTierModel = strategy.candidate_models.find(m => m.quality_tier === strategy.strategy_params.low_tier_quality);
            
            if (estimatedTokens > strategy.strategy_params.threshold) {
                chosenModelName = highTierModel?.model_name;
            } else {
                chosenModelName = lowTierModel?.model_name;
            }
        }
        // Future logic for other strategies like 'lowest_cost' would go here
        
        if (!chosenModelName) {
            throw new Error(`Could not determine a real model for strategy '${modelToUse}'. Check strategy configuration.`);
        }
        
        console.log(`[Smart Routing] Chose real model: ${chosenModelName}`);
        modelToUse = chosenModelName;
    }

    // Rewrite the request body with the final chosen model name
    const bodyToForward = { ...requestBody, model: modelToUse };
    
    const path = slug.join('/');
    const url = `${this.config.base_url}/${path}`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    headers[this.config.auth_header] = `${this.config.auth_scheme || ''} ${decryptedApiKey}`.trim();
    
    return { url, headers, body: JSON.stringify(bodyToForward) };
  }

  // The `parseResponse` function does not need to change.
  async parseResponse(response: Response) {
    const responseData = await response.json();
    if (responseData.error) {
      return { model: responseData.model || 'unknown-error-model', promptTokens: 0, completionTokens: 0 };
    }
    return {
      model: responseData.model,
      promptTokens: responseData.usage?.prompt_tokens || 0,
      completionTokens: responseData.usage?.completion_tokens || 0
    };
  }
}