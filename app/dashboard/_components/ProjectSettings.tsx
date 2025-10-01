// File: app/dashboard/_components/ProjectSettings.tsx
'use client';
import { useState } from 'react';

interface ProjectSettingsProps {
  projectId: string;
  currentBudget: number;
  currentWebhookUrl: string | null; // <-- ADDED: a prop for the webhook
}

export default function ProjectSettings({ projectId, currentBudget, currentWebhookUrl }: ProjectSettingsProps) {
  const [budget, setBudget] = useState(currentBudget);
  const [webhookUrl, setWebhookUrl] = useState(currentWebhookUrl || ''); // <-- ADDED: state for the webhook
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
      // Send both budget and webhookUrl in the payload
      body: JSON.stringify({ 
        budget: Number(budget),
        webhookUrl: webhookUrl 
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
        <label htmlFor={`budget-${projectId}`} style={{ display: 'block', marginBottom: '0.25rem' }}>Monthly Budget (USD)</label>
        <input
          id={`budget-${projectId}`}
          type="number"
          value={budget}
          onChange={(e) => setBudget(Number(e.target.value))}
          min="0"
          step="1"
          style={{ padding: '0.5rem', width: '100%', boxSizing: 'border-box' }}
        />
      </div>

      {/* --- NEW WEBHOOK INPUT FIELD --- */}
      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor={`webhook-${projectId}`} style={{ display: 'block', marginBottom: '0.25rem' }}>Webhook URL for Alerts (Optional)</label>
        <input
          id={`webhook-${projectId}`}
          type="url"
          placeholder="https://hooks.slack.com/..."
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          style={{ padding: '0.5rem', width: '100%', boxSizing: 'border-box' }}
        />
      </div>
      {/* --- END OF NEW FIELD --- */}

      <button onClick={handleSave} disabled={isLoading} style={{ padding: '0.75rem', cursor: 'pointer' }}>
        {isLoading ? 'Saving...' : 'Save Settings'}
      </button>
      
      {message && <p style={{ fontSize: '0.9em', color: isError ? 'red' : 'green', marginTop: '1rem' }}>{message}</p>}
    </div>
  );
}