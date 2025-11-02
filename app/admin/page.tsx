import { createClient } from '@supabase/supabase-js';

// Import all our admin components
import AdminModelManager from './_components/AdminModelManager';
import AdminProviderManager from './_components/AdminProviderManager';
import AdminStrategyManager from './_components/AdminStrategyManager';

/**
 * This is the main page for the Founder's Admin Panel.
 * As a Server Component, it securely fetches all configuration data
 * from the database before rendering the management components.
 */
export default async function AdminPage() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // We will fetch all three categories of data in parallel for performance.
  const [modelsResult, providersResult, strategiesResult] = await Promise.all([
    // Fetch all models and join their provider's name
    supabase.from('models').select(`*, provider:providers ( name )`).order('provider_id').order('model_name'),
    
    // Fetch all providers
    supabase.from('providers').select('*').order('name'),
    
    // Fetch all strategies and join the IDs of the models they are linked to
    supabase.from('routing_strategies').select(`*, strategy_models ( model_id )`)
  ]);
  
  // De-structure the results
  const { data: models, error: modelsError } = modelsResult;
  const { data: providers, error: providersError } = providersResult;
  const { data: strategies, error: strategiesError } = strategiesResult;

  // If any of the essential data fails to load, show an error.
  if (modelsError || providersError || strategiesError || !models || !providers || !strategies) {
    console.error({ modelsError, providersError, strategiesError });
    return <div>Error loading admin data. Please check the server logs.</div>;
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header>
        <h1>Admin Panel: Platform Configuration</h1>
        <p>Manage providers, models, and smart routing strategies.</p>
      </header>

      {/* Render the Provider Manager, passing in the initial provider data */}
      <AdminProviderManager initialProviders={providers} />

      {/* Render the Model Manager, passing in the initial model and provider data */}
      <AdminModelManager initialModels={models} providers={providers} />

      {/* Render the new Strategy Manager, passing in all the necessary data */}
      <AdminStrategyManager 
        initialStrategies={strategies} 
        allModels={models}
        allProviders={providers} 
      />
    </div>
  );
}