'use client'; // This directive marks the component as a Client Component, allowing it to be interactive.

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * A client-side component for the new project creation form.
 * It handles its own state and submits data to our API endpoint.
 */
export default function CreateProjectForm() {
  const [projectName, setProjectName] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter(); // Hook to refresh the page data after a successful creation.

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    setIsError(false);

    // Call our backend API to create the project
    const response = await fetch('/api/projects/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: projectName, openaiKey: openaiKey }),
    });

    const data = await response.json();

    if (response.ok) {
      setMessage(`Project "${projectName}" created successfully!`);
      setIsError(false);
      setProjectName('');
      setOpenaiKey('');
      // Refresh the server component data on the page to show the new project in the list
      router.refresh(); 
    } else {
      setMessage(`Error: ${data.error}`);
      setIsError(true);
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
          style={{ padding: '0.75rem', border: '1px solid #ccc', borderRadius: '4px' }}
        />
        <input
          type="password"
          placeholder="Your OpenAI API Key (sk-...)"
          value={openaiKey}
          onChange={(e) => setOpenaiKey(e.target.value)}
          required
          style={{ padding: '0.75rem', border: '1px solid #ccc', borderRadius: '4px' }}
        />
        <button type="submit" disabled={isLoading} style={{ padding: '0.75rem', cursor: 'pointer', background: '#0070f3', color: 'white', border: 'none', borderRadius: '4px' }}>
          {isLoading ? 'Creating...' : 'Create Project'}
        </button>
      </form>
      {message && (
        <p style={{ marginTop: '1rem', color: isError ? 'red' : 'green' }}>
          {message}
        </p>
      )}
    </div>
  );
}