import { createClient } from '@supabase/supabase-js';
import AdminModelManager from './_components/AdminModelManager';
import AdminProviderManager from './_components/AdminProviderManager';

export default async function AdminPage() {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

  const [modelsResult, providersResult] = await Promise.all([
    supabase.from('models').select(`*, provider:providers ( name )`).order('provider_id'),
    supabase.from('providers').select('*').order('name')
  ]);
  
  const { data: models, error: modelsError } = modelsResult;
  const { data: providers, error: providersError } = providersResult;

  if (modelsError || providersError || !models || !providers) {
    return <div>Error loading admin data. Please check logs.</div>;
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Admin Panel: Configuration</h1>
      <AdminModelManager initialModels={models} providers={providers} />
      <AdminProviderManager initialProviders={providers} />
    </div>
  );
}