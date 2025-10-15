import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import CreateProjectForm from './_components/CreateProjectForm';
import LiveRequestLog from './_components/LiveRequestLog';
import StatWidgets from './_components/StatWidgets';
import ProjectSettings from './_components/ProjectSettings';
import CopyButton from './_components/CopyButton';

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect('/sign-in');
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // --- THE FIX: Add provider_id to the select query ---
  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, name, apiguardian_api_key, monthly_budget, webhook_url, per_user_budget, provider_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    return <div>Error loading your projects. Please refresh the page.</div>;
  }
  
  const baseUrl = "https://apiguardian-v2.vercel.app/api/proxy";

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '800px', margin: 'auto' }}>
      <h1>Your Dashboard</h1>
      <StatWidgets />
      <LiveRequestLog />
      <hr style={{ margin: '3rem 0' }} />
      <h2 style={{ borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Your Guardian Projects</h2>
      {projects && projects.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
          {projects.map((project) => {
            // Construct the dynamic proxy URL for each project
            const proxyUrl = `${baseUrl}/${project.provider_id || 'openai'}/v1`;

            return (
              <div key={project.id} style={{ border: '1px solid #ccc', padding: '1.5rem', borderRadius: '8px', background: '#fafafa' }}>
                <h3 style={{ marginTop: 0 }}>{project.name}</h3>
                
                <div>
                  <strong>APIGuardian Key:</strong>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <pre style={{ flexGrow: 1, /* styles */ }}>
                      <code>{project.apiguardian_api_key}</code>
                    </pre>
                    <CopyButton textToCopy={project.apiguardian_api_key} />
                  </div>
                </div>
                <div style={{ marginTop: '1rem' }}>
                  <strong>Proxy URL:</strong>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <pre style={{ flexGrow: 1, /* styles */ }}>
                      {/* --- THE FIX: Use the dynamically constructed URL --- */}
                      <code>{`${proxyUrl}/chat/completions`}</code>
                    </pre>
                    <CopyButton textToCopy={`${proxyUrl}/chat/completions`} />
                  </div>
                </div>

                <ProjectSettings 
                  projectId={project.id} 
                  currentBudget={project.monthly_budget}
                  currentWebhookUrl={project.webhook_url}
                  currentPerUserBudget={project.per_user_budget}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <p>You haven&apos;t created any projects yet...</p>
      )}
      <hr style={{ margin: '3rem 0' }} />
      <CreateProjectForm />
    </div>
  );
}