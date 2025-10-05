// File: app/dashboard/billing/_components/UpgradeButton.tsx
'use client';
import { useState } from 'react';

export default function UpgradeButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleUpgrade = async () => {
    setIsLoading(true);
    // Call our new backend API to create a checkout session
    const response = await fetch('/api/billing/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // We can hard-code the Startup plan's Price ID for now
      // In a real app, you would have buttons for each plan
      body: JSON.stringify({ priceId: 'prod_TBBXxARfcv3n2l' }),
    });
    
    const { url } = await response.json();
    if (url) {
      // Redirect the user to Stripe's secure checkout page
      window.location.href = url;
    } else {
      alert("Error: Could not create checkout session.");
      setIsLoading(false);
    }
  };
  
  return (
    <button onClick={handleUpgrade} disabled={isLoading} style={{ padding: '0.75rem 1.5rem', cursor: 'pointer' }}>
      {isLoading ? 'Redirecting...' : 'Upgrade to Startup'}
    </button>
  );
}