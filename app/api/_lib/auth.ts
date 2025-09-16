// File: app/api/_lib/auth.ts
import { createClient } from '@supabase/supabase-js';
import { decryptSecret } from './encryption';
// NO import for 'Request' is needed, as it's a global type.

/**
 * Authenticates an incoming API request to the proxy.
 * It validates the `ag-` key and decrypts the provider's secret key.
 * @param request - The incoming Request object.
 * @returns An object indicating success or failure, and containing project data
 *          and the decrypted key on success.
 */
export async function authenticateRequest(request: Request) { // <-- This 'Request' type is now correctly recognized
  // --- The Fix: Initialize Supabase client at runtime, inside the function ---
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // 1. Get the ag- key from the Authorization header
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ag-')) {
    return {
      isValid: false,
      status: 401,
      errorMessage: "Missing or invalid APIGuardian API Key.",
    };
  }
  const agKey = authHeader.split(' ')[1];

  // 2. Fetch the corresponding project from the database
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, user_id, openai_api_key_encrypted, monthly_budget')
    .eq('apiguardian_api_key', agKey)
    .single();

  if (projectError || !project) {
    return {
      isValid: false,
      status: 401,
      errorMessage: "APIGuardian API Key not found.",
    };
  }
  
  if (!project.openai_api_key_encrypted) {
      return {
          isValid: false,
          status: 401,
          errorMessage: "Provider API Key is not configured for this project.",
      }
  }

  // 3. Get the master key from the environment
  const masterKey = process.env.ENCRYPTION_KEY;
  if (!masterKey) {
    console.error("CRITICAL: ENCRYPTION_KEY is not set on the server.");
    return {
      isValid: false,
      status: 500,
      errorMessage: "Internal Server Configuration Error",
    };
  }

  // 4. Decrypt the secret key using our native crypto module
  const decryptedKey = decryptSecret(
    project.openai_api_key_encrypted,
    masterKey
  );

  if (!decryptedKey) {
    console.error(`CRITICAL: Failed to decrypt secret for project: ${project.id}. Master key may be wrong.`);
    return {
      isValid: false,
      status: 500,
      errorMessage: "Internal Security Error",
    };
  }

  // 5. Success! Return the validated data.
  return {
    isValid: true,
    status: 200,
    project: project, // Return the full project object
    decryptedKey: decryptedKey,
  };
}