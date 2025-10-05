// File: app/dashboard/billing/page.tsx
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import UpgradeButton from './_components/UpgradeButton'; // We will create this next

export default async function BillingPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect('/sign-in');
  }

  // We will need a 'plan' column in our users table. Let's assume it exists.
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
  const { data: userData } = await supabase.from('users').select('plan').eq('id', userId).single();
  const userPlan = userData?.plan || 'free';

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: 'auto' }}>
      <h1>Billing & Plan</h1>
      <div style={{ border: '1px solid #eee', padding: '1.5rem', borderRadius: '8px' }}>
        <p>Your current plan: <strong>{userPlan.charAt(0).toUpperCase() + userPlan.slice(1)}</strong></p>
        {userPlan === 'free' && (
          <div>
            <p>Upgrade to unlock powerful features like hard budget limits and more requests.</p>
            {/* This will be our interactive button */}
            <UpgradeButton />
          </div>
        )}
        {userPlan !== 'free' && (
          <p>Thank you for being a subscriber!</p>
          // We'll add a Stripe customer portal link here later
        )}
      </div>
    </div>
  );
}