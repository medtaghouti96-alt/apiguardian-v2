'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Provider = { id: string; name: string; base_url: string; auth_header: string; auth_scheme: string | null; message_format_style: string; };
const newProviderInitialState = { id: '', name: '', base_url: '', auth_header: 'Authorization', auth_scheme: 'Bearer', message_format_style: 'openai' };

export default function AdminProviderManager({ initialProviders }: { initialProviders: Provider[] }) {
  const [providers, setProviders] = useState(initialProviders);
  const [newProvider, setNewProvider] = useState(newProviderInitialState);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleCreate = async () => {
    setIsLoading(true);
    const res = await fetch('/api/admin/create-provider', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProvider)
    });
    const data = await res.json();
    setMessage(data.message || data.error);
    if (res.ok) {
      setNewProvider(newProviderInitialState);
      router.refresh();
    }
    setIsLoading(false);
  };
  
  return (
    <div style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '8px', marginTop: '2rem' }}>
      <h2>Providers</h2>
      {message && <p style={{background: '#eee', padding: '1rem'}}><strong>Status:</strong> {message}</p>}
      <table style={{width: '100%', borderCollapse: 'collapse'}}>
        <thead><tr><th>ID</th><th>Name</th><th>Base URL</th><th>Auth Header</th></tr></thead>
        <tbody>
          {providers.map(p => (
            <tr key={p.id}><td>{p.id}</td><td>{p.name}</td><td>{p.base_url}</td><td>{p.auth_header}</td></tr>
          ))}
        </tbody>
      </table>
      <div style={{ background: '#f0fff0', padding: '1rem', marginTop: '1rem' }}>
        <h3>Add New Provider</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <input placeholder="ID (e.g., anthropic)" value={newProvider.id} onChange={e => setNewProvider({...newProvider, id: e.target.value})} />
          <input placeholder="Name (e.g., Anthropic)" value={newProvider.name} onChange={e => setNewProvider({...newProvider, name: e.target.value})} />
          <input placeholder="Base URL" value={newProvider.base_url} onChange={e => setNewProvider({...newProvider, base_url: e.target.value})} />
          <input placeholder="Auth Header" value={newProvider.auth_header} onChange={e => setNewProvider({...newProvider, auth_header: e.target.value})} />
          <input placeholder="Auth Scheme" value={newProvider.auth_scheme || ''} onChange={e => setNewProvider({...newProvider, auth_scheme: e.target.value})} />
          <select value={newProvider.message_format_style} onChange={e => setNewProvider({...newProvider, message_format_style: e.target.value})}>
              <option value="openai">OpenAI Style</option><option value="anthropic">Anthropic Style</option>
          </select>
        </div>
        <button onClick={handleCreate} disabled={isLoading} style={{marginTop: '1rem'}}>{isLoading ? 'Saving...' : 'Create New Provider'}</button>
      </div>
    </div>
  );
}