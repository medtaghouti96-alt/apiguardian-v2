'use client';
import { useState } from 'react';

interface ProjectSettingsProps {
  projectId: string;
  currentBudget: number | null;
  currentWebhookUrl: string | null;
  currentPerUserBudget: number | null;
}

export default function ProjectSettings({ projectId, currentBudget, currentWebhookUrl, currentPerUserBudget }: ProjectSettingsProps) {
  const [budget, setBudget] = useState(currentBudget || 0);
  const [webhookUrl, setWebhookUrl] = useState(currentWebhookUrl || '');
  const [perUserBudget, setPerUserBudget] = useState(currentPerUserBudget || 0);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    setMessage('');
    setIsError(false);
    
    const response = await fetch(`/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        budget: Number(budget),
        webhookUrl: webhookUrl,
        perUserBudget: Number(perUserBudget)
      }),
    });

    if (response.ok) {
      setMessage('Settings saved successfully!');
      setIsError(false);
    } else {
      setMessage('Error: Could not save settings.');
      setIsError(true);
    }
    setIsLoading(false);
  };

  return (
    <div style={{ marginTop: '1rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
      <h4>Settings</h4>
      
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.25rem' }}>Global Monthly Budget (USD)</label>
        <input
          type="number" value={budget} onChange={(e) => setBudget(Number(e.target.value))}
          min="0" step="1" style={{ padding: '0.5rem', width: '100%', boxSizing: 'border-box' }}
        />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.25rem' }}>Per-User Monthly Budget (USD)</label>
        <input
          type="number" value={perUserBudget} onChange={(e) => setPerUserBudget(Number(e.target.value))}
          min="0" step="0.01" placeholder="e.g., 5.00"
          style={{ padding: '0.5rem', width: '100%', boxSizing: 'border-box' }}
        />
        <small style={{color: '#666'}}>Set to 0 or leave blank to disable. Blocks any individual user who exceeds this spend.</small>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.25rem' }}>Webhook URL for Alerts (Optional)</label>
        <input
          type="url" placeholder="https://hooks.slack.com/..."
          value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)}
          style={{ padding: '0.5rem', width: '100%', boxSizing: 'border-box' }}
        />
      </div>

      <button onClick={handleSave} disabled={isLoading} style={{ padding: '0.75rem', cursor: 'pointer' }}>
        {isLoading ? 'Saving...' : 'Save Settings'}
      </button>
      
      {message && <p style={{ fontSize: '0.9em', color: isError ? 'red' : 'green', marginTop: '1rem' }}>{message}</p>}
    </div>
  );
}