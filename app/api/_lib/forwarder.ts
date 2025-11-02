import { ProviderAdapter } from './providers/interface';

interface ForwardRequestParams {
  request: Request;
  decryptedKey: string;
  adapter: ProviderAdapter;
  slug: string[];
}

export async function forwardRequestToProvider({
  request,
  decryptedKey,
  adapter,
  slug,
}: ForwardRequestParams): Promise<Response> {
  const requestBody = await request.json();

  // --- THE FIX: Add the 'await' keyword ---
  // `transformRequest` is now async because it may need to fetch a strategy from the DB.
  const providerRequest = await adapter.transformRequest(
    decryptedKey,
    requestBody,
    slug
  );

  return fetch(providerRequest.url, {
    method: 'POST',
    headers: providerRequest.headers,
    body: providerRequest.body,
  });
}