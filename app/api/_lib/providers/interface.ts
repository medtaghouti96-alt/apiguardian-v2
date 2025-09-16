// File: app/api/_lib/providers/interface.ts
export interface ProviderRequestData {
  url: string;
  headers: Record<string, string>;
  body: string;
}
export interface ProviderAdapter {
  id: string;
  transformRequest(decryptedApiKey: string, requestBody: Record<string, unknown>, slug: string[]): ProviderRequestData;
  parseResponse(response: Response): Promise<{ model: string; promptTokens: number; completionTokens: number; }>;
}