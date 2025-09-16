// File: app/dashboard/page.tsx
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import CreateProjectForm from './_components/CreateProjectForm';
import LiveRequestLog from './_components/LiveRequestLog'; // Import the client component

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect('/sign-in');
  }

  // (We will add the project list back here later)

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '800px', margin: 'auto' }}>
      <h1>Your Dashboard</h1>
      
      {/* Render the LiveRequestLog component */}
      <LiveRequestLog />
      
      <hr style={{ margin: '3rem 0', border: 'none', borderTop: '1px solid #eee' }} />
      
      <CreateProjectForm />
    </div>
  );
}