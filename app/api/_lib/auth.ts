// File: app/api/_lib/auth.ts (FINAL DEBUG VERSION)
import { createClient } from '@supabase/supabase-js';
// ... other imports

export async function authenticateRequest(request: Request) {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ag-')) {
    return { isValid: false, status: 401, /*...*/ };
  }
  const agKey = authHeader.split(' ')[1];

  const { data: project, error: projectError } = await supabase.from('projects')
    .select('id, user_id, apiguardian_api_key, openai_api_key_encrypted, monthly_budget, per_user_budget') // Select the key
    .eq('apiguardian_api_key', agKey)
    .single();

  // --- THIS IS THE NEW, CRITICAL DEBUG BLOCK ---
  if (projectError || !project) {
    // We will now log what we are searching for and what the error is.
    console.log(`--- AUTH DEBUG: KEY NOT FOUND ---`);
    console.log(`Searching for key: [${agKey}]`);
    console.log(`Supabase response error: ${projectError?.message || 'No record returned.'}`);
    console.log(`---------------------------------`);
    
    // Now, to prove what's in the database, let's fetch the project by a known value, like its name
    const { data: projectByName } = await supabase.from('projects').select('apiguardian_api_key').eq('name', 'hama').single();
    if(projectByName) {
        console.log(`DEBUG: Key stored in DB for project 'hama' is: [${projectByName.apiguardian_api_key}]`);
    } else {
        console.log("DEBUG: Could not find project named 'hama' to read back key.");
    }
    
    return { isValid: false, status: 401, errorMessage: "APIGuardian API Key not found." };
  }
  // --- END OF DEBUG BLOCK ---
  
  // ... the rest of the working code ...
  if (!project.openai_api_key_encrypted) { /*...*/ }
  // ... etc. ...

  return { isValid: true, project, /*...*/ };
}