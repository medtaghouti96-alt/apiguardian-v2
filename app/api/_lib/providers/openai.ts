// File: app/api/_lib/providers/openai.ts
import { ProviderAdapter, ProviderRequestData } from './interface';
export const OpenAIAdapter: ProviderAdapter = {
  id: 'openai',
  transformRequest(decryptedApiKey, requestBody, slug) {
    const openaiPath = slug.join('/');
    const url = `https://api.openai.com/${openaiPath}`;
    return {
      url,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${decryptedApiKey}` },
      body: JSON.stringify(requestBody),
    };
  },
  async parseResponse(response) {
    const responseData = await response.json();
    if (responseData.error) {
      console.error("Error from OpenAI API:", responseData.error.message);
      return { model: responseData.model || 'unknown-error-model', promptTokens: 0, completionTokens: 0 };
    }
    return {
      model: responseData.model,
      promptTokens: responseData.usage?.prompt_tokens || 0,
      completionTokens: responseData.usage?.completion_tokens || 0
    };
  },
};