import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';

// Import all our dashboard components
import CreateProjectForm from './_components/CreateProjectForm';
import LiveRequestLog from './_components/LiveRequestLog';
import StatWidgets from './_components/StatWidgets';
import ProjectSettings from './_components/ProjectSettings'; // <-- 1. IMPORT THE NEW COMPONENT

/**
 * This is the main dashboard page for authenticated users.
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

  // --- 2. THE CHANGE: Fetch `monthly_budget` in addition to other fields ---
  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, name, apiguardian_api_key, monthly_budget')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching projects:", error);
    return <div>Error loading your projects. Please refresh the page.</div>;
  }
  
  const proxyUrl = "https://apiguardian-v2.vercel.app/api/proxy/openai/v1";

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '800px', margin: 'auto' }}>
      <h1>Your Dashboard</h1>

      <StatWidgets />
      
      <LiveRequestLog />
      
      <hr style={{ margin: '3rem 0', border: 'none', borderTop: '1px solid #eee' }} />
      
      <h2 style={{ borderBottom: '1px solid #eee', paddingBottom: '0.5rem' }}>Your Guardian Projects</h2>
      {projects && projects.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
          {projects.map((project) => (
            <div key={project.id} style={{ border: '1px solid #ccc', padding: '1.5rem', borderRadius: '8px', background: '#fafafa' }}>
              <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>{project.name}</h3>
              <div>
                <strong>APIGuardian Key:</strong>
                <pre style={{ background: '#eee', padding: '0.75rem', borderRadius: '4px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', marginTop: '0.5rem' }}>
                  <code>{project.apiguardian_api_key}</code>
                </pre>
              </div>
              <div style={{ marginTop: '1rem' }}>
                <strong>Proxy URL:</strong>
                 <pre style={{ background: '#eee', padding: '0.75rem', borderRadius: '4px', whiteSpace: 'pre-wrap', wordBreak: 'break-all', marginTop: '0.5rem' }}>
                  <code>{proxyUrl}</code>
                </pre>
              </div>

              {/* --- 3. THE CHANGE: Render the ProjectSettings component for each project --- */}
              {/* We pass the project's ID and its current budget as props */}
              <ProjectSettings projectId={project.id} currentBudget={project.monthly_budget} />

            </div>
          ))}
        </div>
      ) : (
        <p>You haven&apos;t created any projects yet. Use the form below to get started.</p>
      )}
      
      <hr style={{ margin: '3rem 0', border: 'none', borderTop: '1px solid #eee' }} />

      <CreateProjectForm />
    </div>
  );
}