'use client';
import { useState } from 'react';

interface ProjectSettingsProps {
  projectId: string;
  currentBudget: number | null;
  currentWebhookUrl: string | null;
  currentPerUserBudget: number | null;
  currentCachingEnabled: boolean | null;
  currentCacheTtl: number | null;
}

export default function ProjectSettings({ 
    projectId, 
    currentBudget, 
    currentWebhookUrl, 
    currentPerUserBudget,
    currentCachingEnabled, 
    currentCacheTtl 
}: ProjectSettingsProps) {
  // State for existing settings
  const [budget, setBudget] = useState(currentBudget || 0);
  const [webhookUrl, setWebhookUrl] = useState(currentWebhookUrl || '');
  const [perUserBudget, setPerUserBudget] = useState(currentPerUserBudget || 0);
  
  // State for the new caching feature
  const [cachingEnabled, setCachingEnabled] = useState(currentCachingEnabled || false);
  const [cacheTtl, setCacheTtl] = useState(currentCacheTtl || 3600); // Default to 1 hour (3600s)

  // UI state
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    setMessage('');
    setIsError(false);
    
    // Send all settings in a single API call
    const response = await fetch(`/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        budget: Number(budget),
        webhookUrl: webhookUrl,
        perUserBudget: Number(perUserBudget),
        cachingEnabled: cachingEnabled,
        cacheTtl: Number(cacheTtl)
      }),
    });

    if (response.ok) {
      setMessage('Settings saved successfully!');
      setIsError(false);
    } else {
      const data = await response.json();
      setMessage(data.error || 'Error: Could not save settings.');
      setIsError(true);
    }
    setIsLoading(false);
  };

  return (
    <div style={{ marginTop: '1.5rem', borderTop: '1px solid #eee', paddingTop: '1.5rem' }}>
      <h4>Settings</h4>
      
      {/* --- Budget Settings --- */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Global Monthly Budget (USD)</label>
        <input
          type="number" value={budget} onChange={(e) => setBudget(Number(e.target.value))}
          min="0" step="1" style={{ padding: '0.5rem', width: '100%', boxSizing: 'border-box' }}
        />
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Per-User Monthly Budget (USD)</label>
        <input
          type="number" value={perUserBudget} onChange={(e) => setPerUserBudget(Number(e.target.value))}
          min="0" step="0.01" placeholder="e.g., 5.00"
          style={{ padding: '0.5rem', width: '100%', boxSizing: 'border-box' }}
        />
        <small style={{color: '#666'}}>Set to 0 or leave blank to disable. Blocks any individual user who exceeds this spend.</small>
      </div>

      {/* --- Notification Settings --- */}
       <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Webhook URL for Alerts (Optional)</label>
        <input
          type="url" placeholder="https://hooks.slack.com/..."
          value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)}
          style={{ padding: '0.5rem', width: '100%', boxSizing: 'border-box' }}
        />
      </div>

      {/* --- Caching Settings --- */}
      <div style={{ marginTop: '1.5rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
        <h5 style={{marginTop: 0}}>Request Caching</h5>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <input
            type="checkbox"
            id={`caching-${projectId}`}
            checked={cachingEnabled}
            onChange={(e) => setCachingEnabled(e.target.checked)}
            style={{width: '16px', height: '16px'}}
          />
          <label htmlFor={`caching-${projectId}`}>Enable Request Caching to save money and improve speed</label>
        </div>
        {cachingEnabled && (
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>Cache Lifetime (seconds)</label>
            <input
              type="number" value={cacheTtl} onChange={(e) => setCacheTtl(Number(e.target.value))}
              min="60" step="60"
              style={{ padding: '0.5rem', width: '100%', boxSizing: 'border-box' }}
            />
            <small style={{color: '#666'}}>How long to store a cached response. Default is 3600 (1 hour).</small>
          </div>
        )}
      </div>

      <button onClick={handleSave} disabled={isLoading} style={{ marginTop: '1.5rem', padding: '0.75rem 1.5rem', cursor: 'pointer', background: '#0070f3', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1rem' }}>
        {isLoading ? 'Saving...' : 'Save All Settings'}
      </button>
      
      {message && <p style={{ fontSize: '0.9em', color: isError ? 'red' : 'green', marginTop: '1rem' }}>{message}</p>}
    </div>
  );
}