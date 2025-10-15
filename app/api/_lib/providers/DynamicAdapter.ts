// File: app/api/_lib/providers/DynamicAdapter.ts
import { ProviderAdapter } from './interface';
import { ProviderConfig } from '../config-loader';

export class DynamicAdapter implements ProviderAdapter {
  public id: string;
  private config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.id = config.id;
    this.config = config;
  }

  transformRequest(decryptedApiKey: string, requestBody: Record<string, unknown>, slug: string[]) {
    const path = slug.join('/');
    const url = `${this.config.base_url}/${path}`;
    
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    headers[this.config.auth_header] = `${this.config.auth_scheme || ''} ${decryptedApiKey}`.trim();
    
    // For our MVP, we are in "Direct Proxy" mode, so no translation.
    return { url, headers, body: JSON.stringify(requestBody) };
  }

  async parseResponse(response: Response) {
    // This logic remains similar, but we will make it dynamic later
    const responseData = await response.json();
    return {
      model: responseData.model,
      promptTokens: responseData.usage?.prompt_tokens || 0,
      completionTokens: responseData.usage?.completion_tokens || 0
    };
  }
}