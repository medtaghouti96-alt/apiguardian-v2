import { ProviderAdapter } from './interface';

export const GroqAdapter: ProviderAdapter = {
  id: 'groq',
  transformRequest(decryptedApiKey: string, requestBody: Record<string, unknown>, slug: string[]) {
    // The incoming slug will be ["v1", "chat", "completions"]
    // We want to join them to form "v1/chat/completions"
    const groqPath = slug.join('/');
    
    // This is the correct final URL structure for Groq's OpenAI-compatible endpoint
    const url = `https://api.groq.com/openai/${groqPath}`;
    
    return {
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${decryptedApiKey}`
      },
      body: JSON.stringify(requestBody)
    };
  },
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