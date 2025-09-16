// No longer need to import NextRequest
import { ProviderAdapter } from './providers/interface';

interface ForwardRequestParams {
  request: Request; // <-- THE FIX: Use the standard web 'Request' type
  decryptedKey: string;
  adapter: ProviderAdapter;
}
export async function forwardRequestToProvider({ request, decryptedKey, adapter }: ForwardRequestParams): Promise<Response> {
  const url = new URL(request.url);
  const slugParts = url.pathname.split('/api/proxy/')[1]?.split('/');
  if (!slugParts) throw new Error("Could not parse provider path from URL.");
  const slugWithoutProvider = slugParts.slice(1);
  const providerRequest = adapter.transformRequest(decryptedKey, await request.json(), slugWithoutProvider);
  return fetch(providerRequest.url, {
    method: 'POST',
    headers: providerRequest.headers,
    body: providerRequest.body,
  });
}