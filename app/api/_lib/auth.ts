// File: app/api/_lib/auth.ts
import { createClient } from '@supabase/supabase-js';
import { decryptSecret } from './encryption';
import { NextRequest } from 'next/server';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

export async function authenticateRequest(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ag-')) {
    return { isValid: false, status: 401, errorMessage: "Missing or invalid APIGuardian API Key." };
  }
  const agKey = authHeader.split(' ')[1];

  const { data: project, error: projectError } = await supabase
    .from('projects').select('id, user_id, openai_api_key_encrypted, monthly_budget')
    .eq('apiguardian_api_key', agKey).single();

  if (projectError || !project) {
    return { isValid: false, status: 401, errorMessage: "APIGuardian API Key not found." };
  }
  if (!project.openai_api_key_encrypted) {
    return { isValid: false, status: 401, errorMessage: "Provider API Key is not configured for this project." };
  }

  const masterKey = process.env.ENCRYPTION_KEY;
  if (!masterKey) {
    console.error("CRITICAL: ENCRYPTION_KEY is not set.");
    return { isValid: false, status: 500, errorMessage: "Internal Server Configuration Error" };
  }

  const decryptedKey = decryptSecret(project.openai_api_key_encrypted, masterKey);

  if (!decryptedKey) {
    console.error(`CRITICAL: Failed to decrypt secret for project: ${project.id}.`);
    return { isValid: false, status: 500, errorMessage: "Internal Security Error" };
  }

  return { isValid: true, status: 200, project, decryptedKey };
}