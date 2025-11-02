import { ProviderAdapter, ProviderRequestData } from './interface';
import { ProviderConfig, getStrategyConfig } from '../config-loader';

// Define a specific, non-any type for the message structure
type Message = {
  role: string;
  content: string | null;
};

// Update the helper to use the specific type
function estimateTokens(messages: Message[]): number {
    if (!messages || !Array.isArray(messages)) return 0;
    const fullPrompt = messages.map(m => m.content || '').join('\n');
    return fullPrompt.length / 4; // Rough but fast estimation
}

export class DynamicAdapter implements ProviderAdapter {
  public id: string;
  private config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.id = config.id;
    this.config = config;
  }

  async transformRequest(decryptedApiKey: string, requestBody: Record<string, unknown>, slug: string[]): Promise<ProviderRequestData> {
    let modelToUse = requestBody.model as string;
    
    if (modelToUse && modelToUse.startsWith('@')) {
        const virtualModelName = modelToUse.split('/')[1] || modelToUse;
        const strategy = await getStrategyConfig(this.id, virtualModelName);
        if (!strategy) {
            throw new Error(`Smart strategy '${virtualModelName}' not found for provider '${this.id}'.`);
        }

        let chosenModelName: string | undefined = undefined;
        if (strategy.strategy_logic === 'quality_threshold') {
            // Use the specific type cast for safety
            const estimatedTokens = estimateTokens(requestBody.messages as Message[]);
            
            // Use non-null assertion (!) because we know these params exist for this logic
            const highTierModel = strategy.candidate_models.find(m => m.quality_tier === strategy.strategy_params.high_tier_quality);
            const lowTierModel = strategy.candidate_models.find(m => m.quality_tier === strategy.strategy_params.low_tier_quality);
            
            if (estimatedTokens > strategy.strategy_params.threshold!) {
                chosenModelName = highTierModel?.model_name;
            } else {
                chosenModelName = lowTierModel?.model_name;
            }
        }
        
        if (!chosenModelName) {
            throw new Error(`Could not determine a real model for strategy '${virtualModelName}'.`);
        }
        
        console.log(`[Smart Routing] Chose real model: ${chosenModelName}`);
        modelToUse = chosenModelName;
    }

    const bodyToForward = { ...requestBody, model: modelToUse };
    const path = slug.join('/');
    const url = `${this.config.base_url}/${path}`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    headers[this.config.auth_header] = `${this.config.auth_scheme || ''} ${decryptedApiKey}`.trim();
    
    return { url, headers, body: JSON.stringify(bodyToForward) };
  }

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