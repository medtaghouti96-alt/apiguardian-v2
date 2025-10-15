// File: app/admin/page.tsx
import { createClient } from '@supabase/supabase-js';
import AdminModelManager from './_components/AdminModelManager';

export default async function AdminPage() {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

  // Fetch all models and providers in parallel
  const [modelsResult, providersResult] = await Promise.all([
    supabase.from('models').select(`*, provider:providers ( name )`).order('provider_id').order('model_name'),
    supabase.from('providers').select('*')
  ]);
  
  const { data: models, error: modelsError } = modelsResult;
  const { data: providers, error: providersError } = providersResult;

  if (modelsError || providersError || !models || !providers) {
    return <div>Error loading admin data. Please check the logs.</div>;
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Admin Panel: Model Configuration</h1>
      {/* We pass all data to a single, interactive client component */}
      <AdminModelManager initialModels={models} providers={providers} />
    </div>
  );
}