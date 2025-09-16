import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import CreateProjectForm from './_components/CreateProjectForm';

export default async function DashboardPage() {
  // We now correctly await the auth() call
  const { userId } = await auth(); 
  if (!userId) {
    redirect('/sign-in');
  }

  // We will fetch projects in the next part.
  
  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Your Dashboard</h1>
      <p>Welcome! Manage your APIGuardian projects below.</p>
      
      <hr style={{ margin: '2rem 0' }} />
      
      <CreateProjectForm />
    </div>
  );
}