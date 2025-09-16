// File: app/api/_lib/provider-factory.ts
import { NextRequest } from 'next/server';
import { OpenAIAdapter } from './providers/openai';
import { ProviderAdapter } from './providers/interface';

export function getProviderAdapter(req: Request): ProviderAdapter | null {
  const url = new URL(req.url);
  const providerId = url.pathname.split('/api/proxy/')[1]?.split('/')[0];
  if (providerId === 'openai') return OpenAIAdapter;
  return null;
}