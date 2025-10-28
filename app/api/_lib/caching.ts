// File: app/api/_lib/caching.ts
import { createHash } from 'crypto';

/**
 * Creates a stable, unique SHA256 hash for a given JSON object.
 * This acts as a "fingerprint" for a specific API request.
 * @param requestBody The JSON body of the user's request.
 * @returns A SHA256 hash as a hex string.
 */
export function createRequestHash(requestBody: Record<string, unknown>): string {
  // Stringify the body to create a consistent text representation.
  // A simple stringify is sufficient and fast for our MVP.
  const canonicalString = JSON.stringify(requestBody);
  
  // Use the built-in crypto module to create a secure hash.
  return createHash('sha256').update(canonicalString).digest('hex');
}