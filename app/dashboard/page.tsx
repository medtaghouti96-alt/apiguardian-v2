import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';

// Import all our dashboard components
import CreateProjectForm from './_components/CreateProjectForm';
import LiveRequestLog from './_components/LiveRequestLog';
import StatWidgets from './_components/StatWidgets';

/**
 * This is the main dashboard page, now with added debugging logs to diagnose
 * why the project list is not appearing.
 */
export default async function DashboardPage() {
  // --- START OF DEBUGGING BLOCK ---
  console.log("--- Executing DashboardPage Server Component ---");
  const { userId } = await auth();
  
  // This is the most important log. It tells us which user is currently logged in.
  console.log(`Clerk auth() returned userId: ${userId}`);
  // --- END OF DEBUGGING BLOCK ---

  if (!userId) {
    // If Clerk finds no user, redirect to the sign-in page.
    redirect('/sign-in');
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // We are fetching projects where the 'user_id' column matches the ID from Clerk.
  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, name, apiguardian_api_key')
    .eq('user_id', userId) 
    .order('created_at', { ascending: false });

  // --- START OF DEBUGGING BLOCK ---
  // This log tells us the result of our database query.
  // If this is an empty array [], it means no projects were found for the userId above.
  console.log(`Supabase query for projects returned: ${JSON.stringify(projects, null, 2)}`);
  
  if (error) {
    // If the query itself failed, we log the error message.
    console.error("Supabase query error:", error.message);
  }
  // --- END OF DEBUGGING BLOCK ---

  if (error) {
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