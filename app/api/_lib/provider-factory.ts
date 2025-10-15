// File: app/api/_lib/provider-factory.ts

// NO import from 'next/server' is needed.
import { getProviderConfig } from './config-loader';
import { DynamicAdapter } from './providers/DynamicAdapter';
import { ProviderAdapter } from './providers/interface';

export interface ProviderFactoryResult {
  adapter: ProviderAdapter | null;
  slug: string[];
}

export async function getProviderAdapter(req: Request): Promise<ProviderFactoryResult> {
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/api/proxy/')[1]?.split('/') || [];
  const providerId = pathParts[0];
  const slug = pathParts.slice(1);

  if (!providerId) {
    return { adapter: null, slug };
  }

  // Fetch the provider's configuration from the database (via cache)
  const providerConfig = await getProviderConfig(providerId);

  if (!providerConfig) {
    return { adapter: null, slug };
  }

  // Create a new instance of our DynamicAdapter, configured for this specific provider
  const adapter = new DynamicAdapter(providerConfig);
  
  return { adapter, slug };
}