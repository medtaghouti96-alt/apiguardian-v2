// File: app/dashboard/_components/CreateProjectForm.tsx
'use client'; // This is a Client Component because it's interactive

import { useState } from 'react';

export default function CreateProjectForm() {
  const [projectName, setProjectName] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    const response = await fetch('/api/projects/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: projectName, openaiKey: openaiKey }),
    });

    const data = await response.json();

    if (response.ok) {
      setMessage(`Project created successfully! Your new APIGuardian Key is: ${data.apiKey}`);
      setProjectName('');
      setOpenaiKey('');
      // In a real app, we'd use router.refresh() here, but for now this is fine.
    } else {
      setMessage(`Error: ${data.error}`);
    }
    setIsLoading(false);
  };

  return (
    <div>
      <h2>Create a New Guardian Project</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', maxWidth: '400px', gap: '1rem' }}>
        <input
          type="text"
          placeholder="Project Name (e.g., My SaaS App)"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          required
          style={{ padding: '0.5rem' }}
        />
        <input
          type="password"
          placeholder="Your OpenAI API Key (sk-...)"
          value={openaiKey}
          onChange={(e) => setOpenaiKey(e.target.value)}
          required
          style={{ padding: '0.5rem' }}
        />
        <button type="submit" disabled={isLoading} style={{ padding: '0.5rem' }}>
          {isLoading ? 'Creating...' : 'Create Project'}
        </button>
      </form>
      {message && <p style={{ marginTop: '1rem', color: message.startsWith('Error') ? 'red' : 'green' }}>{message}</p>}
    </div>
  );
}