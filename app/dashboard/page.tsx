import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';

// Import the form component we will create next
import CreateProjectForm from './_components/CreateProjectForm';

/**
 * This is the main dashboard page for authenticated users.
 * As a Server Component, it securely fetches data on the server before rendering the page.
 */
export default async function DashboardPage() {
  // 1. Get the user's ID from Clerk. This is a secure, server-side check.
  const { userId } = await auth();
  if (!userId) {
    // If the user is not logged in, redirect them to the sign-in page.
    redirect('/sign-in');
  }

  // 2. Create a Supabase client to fetch data.
  // We use the service key here for secure, server-side data access.
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // 3. Fetch all projects that belong to the current user from the database.
  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, name, apiguardian_api_key')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching projects:", error);
    // Handle the error gracefully by showing a message to the user.
    return <div>Error loading your projects. Please refresh the page.</div>;
  }
  
  // Define the constant proxy URL to display to the user.
  const proxyUrl = "https://apiguardian-v2.vercel.app/api/proxy/openai/v1";

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '800px', margin: 'auto' }}>
      <h1>Your Dashboard</h1>
      
      {/* --- Section for displaying the list of existing projects --- */}
      <h2 style={{ borderBottom: '1px solid #eee', paddingBottom: '0.5rem', marginTop: '2rem' }}>Your Guardian Projects</h2>
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
        // This message is shown if the user has no projects yet.
        <p>You haven&apos;t created any projects yet. Use the form below to get started.</p>
      )}
      
      <hr style={{ margin: '3rem 0', border: 'none', borderTop: '1px solid #eee' }} />

      {/* --- Section for the "Create New Project" form --- */}
      <CreateProjectForm />
    </div>
  );
}