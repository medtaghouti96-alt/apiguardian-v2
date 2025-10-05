// File: app/dashboard/page.tsx
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import CreateProjectForm from './_components/CreateProjectForm';
import LiveRequestLog from './_components/LiveRequestLog';
import StatWidgets from './_components/StatWidgets';
import ProjectSettings from './_components/ProjectSettings';

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect('/sign-in');
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // --- THE CHANGE: Add webhook_url to the select query ---
  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, name, apiguardian_api_key, monthly_budget, webhook_url')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    return <div>Error loading your projects.. Please refresh the page.</div>;
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
              {/* ... Project name, API key, and URL display ... */}
              <h3 style={{ marginTop: 0 }}>{project.name}</h3>
              {/* ... pre blocks ... */}

              {/* --- THE CHANGE: Pass the new webhook prop --- */}
              <ProjectSettings 
                projectId={project.id} 
                currentBudget={project.monthly_budget}
                currentWebhookUrl={project.webhook_url} 
              />
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