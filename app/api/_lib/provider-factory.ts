// File: app/api/_lib/provider-factory.ts

// NO import from 'next/server' is needed here.
import { OpenAIAdapter } from './providers/openai';
import { GroqAdapter } from './providers/groq';
import { ProviderAdapter } from './providers/interface';

/**
 * Determines which provider adapter to use based on the incoming request URL.
 * @param req - The incoming Request object (this is a global type).
 * @returns The appropriate ProviderAdapter or null if none is found.
 */
export function getProviderAdapter(req: Request): ProviderAdapter | null {
  const url = new URL(req.url);
  const providerId = url.pathname.split('/api/proxy/')[1]?.split('/')[0];

  if (providerId === 'openai') {
    return OpenAIAdapter;
  }
  
  if (providerId === 'groq') {
    return GroqAdapter;
  }
  
  return null;
}