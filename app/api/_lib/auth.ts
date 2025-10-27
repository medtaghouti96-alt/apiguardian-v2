// File: app/api/_lib/auth.ts (TEMPORARY "Read-Back" DEBUG VERSION)
import { createClient } from '@supabase/supabase-js';

export async function authenticateRequest(request: Request) {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

  // 1. Get the key the user SENT in the header
  const authHeader = request.headers.get('Authorization');
  const sentKey = authHeader ? authHeader.split(' ')[1] : null;

  // 2. Fetch the project by its NAME to get the key that is STORED in the database
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('apiguardian_api_key')
    .eq('name', 'hama') // We are finding the project named "hama"
    .single();
    
  if (projectError || !project) {
      return { isValid: false, status: 404, errorMessage: `DEBUG: Could not find project with name 'hama'.` };
  }
  
  const storedKey = project.apiguardian_api_key;

  // 3. Compare the two keys
  const areKeysIdentical = sentKey === storedKey;

  // 4. Return a detailed debug message with the comparison
  return {
    isValid: false,
    status: 400,
    errorMessage: `
      DEBUG READ-BACK:
      - Key Sent in Header: [${sentKey}]
      - Key Stored in DB:   [${storedKey}]
      - Do they match?      ${areKeysIdentical}
    `,
    // Add nulls to satisfy the type contract and prevent build errors
    project: null,
    decryptedKey: null,
    currentSpend: 0,
  };
}