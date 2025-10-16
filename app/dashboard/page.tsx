import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';

// Import all our final dashboard components
import CreateProjectForm from './_components/CreateProjectForm';
import LiveRequestLog from './_components/LiveRequestLog';
import StatWidgets from './_components/StatWidgets';
import UserRulesManager from './_components/UserRulesManager';
import CopyButton from './_components/CopyButton';

/**
 * This is the main dashboard page. As a Server Component, it fetches all the initial
 * data for projects and their rules before rendering the page.
 */
export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect('/sign-in');
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // This is a powerful Supabase query that fetches each project AND all of its
  // related rules from the `per_user_rules` table in a single network call.
  const { data: projects, error } = await supabase
    .from('projects')
    .select(`
      id,
      name,
      apiguardian_api_key,
      monthly_budget,
      provider_id,
      rules:per_user_rules ( id, project_id, rule_type, budget_usd )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching projects and rules:", error);
    return <div>Error loading your projects. Please refresh the page.</div>;
  }
  
  const baseUrl = "https://apiguardian-v2.vercel.app/api/proxy";

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '800px', margin: 'auto' }}>
      <header>
        <h1>Your Dashboard</h1>
      </header>

      <StatWidgets />
      
      <LiveRequestLog />
      
      <hr style={{ margin: '3rem 0', border: 'none', borderTop: '1px solid #eee' }} />
      
      <h2 style={{ borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Your Guardian Projects</h2>
      
      {projects && projects.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
          {projects.map((project) => {
            const proxyUrl = `${baseUrl}/${project.provider_id || 'openai'}/v1`;
            return (
              <div key={project.id} style={{ border: '1px solid #ccc', padding: '1.5rem', borderRadius: '8px', background: '#fafafa' }}>
                <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>{project.name}</h3>
                
                <div style={{ marginBottom: '1rem' }}>
                  <strong>APIGuardian Key:</strong>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <pre style={{ flexGrow: 1, background: '#eee', padding: '0.75rem', borderRadius: '4px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', marginTop: '0.5rem' }}>
                      <code>{project.apiguardian_api_key}</code>
                    </pre>
                    <CopyButton textToCopy={project.apiguardian_api_key} />
                  </div>
                </div>

                <div>
                  <strong>Proxy URL Endpoint:</strong>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <pre style={{ flexGrow: 1, background: '#eee', padding: '0.75rem', borderRadius: '4px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', marginTop: '0.5rem' }}>
                      <code>{`${proxyUrl}/chat/completions`}</code>
                    </pre>
                    <CopyButton textToCopy={`${proxyUrl}/chat/completions`} />
                  </div>
                </div>

                {/* --- THE CHANGE: Render the new UserRulesManager --- */}
                {/* We pass the project's ID and its initial set of rules */}
                <UserRulesManager projectId={project.id} initialRules={project.rules} />
              </div>
            );
          })}
        </div>
      ) : (
        <p>You haven&apos;t created any projects yet. Use the form below to get started.</p>
      )}
      
      <hr style={{ margin: '3rem 0', border: 'none', borderTop: '1px solid #eee' }} />

      <CreateProjectForm />
    </div>
  );
}