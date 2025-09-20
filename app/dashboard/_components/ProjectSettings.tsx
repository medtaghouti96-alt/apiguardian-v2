// File: app/dashboard/_components/ProjectSettings.tsx
'use client';
import { useState } from 'react';

interface ProjectSettingsProps {
  projectId: string;
  currentBudget: number;
}

export default function ProjectSettings({ projectId, currentBudget }: ProjectSettingsProps) {
  const [budget, setBudget] = useState(currentBudget);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    setMessage('');
    const response = await fetch(`/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ budget: Number(budget) }),
    });

    if (response.ok) {
      setMessage('Budget saved successfully!');
    } else {
      setMessage('Error: Could not save budget.');
    }
    setIsLoading(false);
  };

  return (
    <div style={{ marginTop: '1rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
      <h4>Settings</h4>
      <label htmlFor={`budget-${projectId}`}>Monthly Budget (USD)</label>
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
        <input
          id={`budget-${projectId}`}
          type="number"
          value={budget}
          onChange={(e) => setBudget(Number(e.target.value))}
          min="0"
          step="1"
          style={{ padding: '0.5rem' }}
        />
        <button onClick={handleSave} disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save'}
        </button>
      </div>
      {message && <p style={{ fontSize: '0.9em', color: 'green' }}>{message}</p>}
    </div>
  );
}