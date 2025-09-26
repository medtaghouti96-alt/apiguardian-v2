import { ProviderAdapter } from './providers/interface';

interface ForwardRequestParams {
  request: Request;
  decryptedKey: string;
  adapter: ProviderAdapter;
  slug: string[]; // <-- ADDED
}

export async function forwardRequestToProvider({
  request,
  decryptedKey,
  adapter,
  slug, // <-- ADDED
}: ForwardRequestParams): Promise<Response> {
  const providerRequest = adapter.transformRequest(
    decryptedKey,
    await request.json(),
    slug // <-- PASS THE SLUG
  );

  return fetch(providerRequest.url, {
    method: 'POST',
    headers: providerRequest.headers,
    body: providerRequest.body,
  });
}