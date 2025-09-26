// File: app/api/_lib/provider-factory.ts
import { OpenAIAdapter } from './providers/openai';
import { GroqAdapter } from './providers/groq';
import { ProviderAdapter } from './providers/interface';

export function getProviderAdapter(req: Request): { adapter: ProviderAdapter | null, slug: string[] } {
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/api/proxy/')[1]?.split('/') || [];
  
  const providerId = pathParts[0];
  const slug = pathParts.slice(1); // --- THE FIX: The slug is everything AFTER the provider ID

  let adapter: ProviderAdapter | null = null;

  if (providerId === 'openai') {
    adapter = OpenAIAdapter;
  }
  if (providerId === 'groq') {
    adapter = GroqAdapter;
  }
  
  return { adapter, slug };
}