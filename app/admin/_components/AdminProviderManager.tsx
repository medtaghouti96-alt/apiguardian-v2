'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Provider = { id: string; name: string; base_url: string; auth_header: string; auth_scheme: string | null; message_format_style: string; };
const newProviderInitialState = { id: '', name: '', base_url: '', auth_header: 'Authorization', auth_scheme: 'Bearer', message_format_style: 'openai' };

export default function AdminProviderManager({ initialProviders }: { initialProviders: Provider[] }) {
  const [providers, setProviders] = useState(initialProviders);
  const [newProvider, setNewProvider] = useState(newProviderInitialState);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const refreshData = () => router.refresh();

  const handleCreate = async () => {
    setIsLoading(true);
    const res = await fetch('/api/admin/create-provider', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newProvider) });
    const data = await res.json();
    setMessage(data.message || data.error);
    if (res.ok) { setNewProvider(newProviderInitialState); refreshData(); }
    setIsLoading(false);
  };

  const handleUpdate = async () => {
    if (!editingProvider) return;
    setIsLoading(true);
    const res = await fetch('/api/admin/update-provider', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editingProvider) });
    const data = await res.json();
    setMessage(data.message || data.error);
    if (res.ok) { setEditingProvider(null); refreshData(); }
    setIsLoading(false);
  };

  const handleDelete = async (providerId: string) => {
    if (!confirm(`Are you sure you want to delete "${providerId}"? This also deletes all its models.`)) return;
    setIsLoading(true);
    const res = await fetch('/api/admin/delete-provider', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ providerId }) });
    const data = await res.json();
    setMessage(data.message || data.error);
    if (res.ok) { refreshData(); }
    setIsLoading(false);
  };
  
  return (
    <div style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '8px', marginTop: '2rem' }}>
      <h2>Providers</h2>
      {message && <p style={{background: '#eee', padding: '1rem'}}><strong>Status:</strong> {message}</p>}

      {/* Table of existing providers */}
      <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '0.9em'}}>
        <thead><tr style={{textAlign: 'left'}}><th>ID</th><th>Name</th><th>Base URL</th><th>Auth Header</th><th>Actions</th></tr></thead>
        <tbody>
          {providers.map(p => (
            <tr key={p.id}>
              <td>{p.id}</td><td>{p.name}</td><td>{p.base_url}</td><td>{p.auth_header}</td>
              <td>
                <button onClick={() => setEditingProvider(p)} disabled={isLoading}>Edit</button>
                <button onClick={() => handleDelete(p.id)} disabled={isLoading}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* EDIT FORM (appears when you click Edit) */}
      {editingProvider && (
        <div style={{ background: '#f0f8ff', padding: '1rem', marginTop: '1rem' }}>
            <h3>Editing Provider: {editingProvider.name}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <input placeholder="Base URL" value={editingProvider.base_url} onChange={e => setEditingProvider({...editingProvider, base_url: e.target.value})} />
                <input placeholder="Auth Header" value={editingProvider.auth_header} onChange={e => setEditingProvider({...editingProvider, auth_header: e.target.value})} />
                <input placeholder="Auth Scheme" value={editingProvider.auth_scheme || ''} onChange={e => setEditingProvider({...editingProvider, auth_scheme: e.target.value})} />
            </div>
            <button onClick={handleUpdate} disabled={isLoading} style={{marginTop: '1rem'}}>Save Changes</button>
            <button onClick={() => setEditingProvider(null)} disabled={isLoading}>Cancel</button>
        </div>
      )}

      {/* Form for creating a new provider */}
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