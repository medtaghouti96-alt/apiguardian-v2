// File: app/api/_lib/providers/groq.ts

import { ProviderAdapter } from './interface';

// This is the adapter for the Groq API.
export const GroqAdapter: ProviderAdapter = {
  // The unique ID for this provider
  id: 'groq',

  // This function transforms a generic request into the format Groq expects.
  transformRequest(decryptedApiKey: string, requestBody: Record<string, unknown>, slug: string[]) {
    const groqPath = slug.join('/');
    
    // The URL points to Groq's OpenAI-compatible endpoint.
    const url = `https://api.groq.com/openai/v1/${groqPath}`;
    
    return {
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${decryptedApiKey}`
      },
      body: JSON.stringify(requestBody)
    };
  },

  // This function parses the response from Groq to find the usage data.
  // Based on our cURL test, we know this structure is correct.
  async parseResponse(response: Response) {
    const responseData = await response.json();
    
    if (responseData.error) {
      console.error("Error from Groq API:", responseData.error.message);
      return { model: responseData.model || 'unknown-groq-error', promptTokens: 0, completionTokens: 0 };
    }

    return {
      model: responseData.model,
      promptTokens: responseData.usage?.prompt_tokens || 0,
      completionTokens: responseData.usage?.completion_tokens || 0
    };
  },
};