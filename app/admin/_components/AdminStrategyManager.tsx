// File: app/admin/_components/AdminStrategyManager.tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Define our data types
type Strategy = { id: string; provider_id: string; virtual_model_name: string; strategy_logic: string; strategy_params: any; description: string | null; strategy_models: { model_id: string }[] };
type Model = { id: string; provider_id: string; model_name: string; };
type Provider = { id: string; name: string; };

const newStrategyInitialState = { provider_id: '', virtual_model_name: '', strategy_logic: 'quality_threshold', strategy_params: { threshold: 2000 }, description: '' };

export default function AdminStrategyManager({ initialStrategies, allModels, allProviders }: { initialStrategies: Strategy[], allModels: Model[], allProviders: Provider[] }) {
  const [strategies, setStrategies] = useState(initialStrategies);
  const [newStrategy, setNewStrategy] = useState(newStrategyInitialState);
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);
  
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  
  const refreshData = () => router.refresh();

  const handleCreate = async () => {
    setIsLoading(true);
    const res = await fetch('/api/admin/strategies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ strategyData: newStrategy, modelIds: selectedModelIds })
    });
    const data = await res.json();
    setMessage(data.message || data.error);
    if (res.ok) {
      setNewStrategy(newStrategyInitialState);
      setSelectedModelIds([]);
      refreshData();
    }
    setIsLoading(false);
  };

  const handleDelete = async (strategyId: string) => {
    if (!confirm('Are you sure you want to delete this strategy?')) return;
    setIsLoading(true);
    const res = await fetch(`/api/admin/strategies/${strategyId}`, { method: 'DELETE' });
    if (res.ok) {
      setMessage('Strategy deleted successfully.');
      refreshData();
    } else {
      const data = await res.json();
      setMessage(data.error || 'Failed to delete strategy.');
    }
    setIsLoading(false);
  };

  const handleCheckboxChange = (modelId: string) => {
    setSelectedModelIds(prev => 
      prev.includes(modelId) ? prev.filter(id => id !== modelId) : [...prev, modelId]
    );
  };
  
  const availableModelsForProvider = allModels.filter(m => m.provider_id === newStrategy.provider_id);

  return (
    <div style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '8px', marginTop: '2rem' }}>
      <h2>Smart Routing Strategies</h2>
      {message && <p style={{background: '#eee', padding: '1rem'}}><strong>Status:</strong> {message}</p>}

      {/* Table of existing strategies */}
      <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '0.9em'}}>
        <thead><tr style={{textAlign: 'left'}}><th>Provider</th><th>Virtual Model</th><th>Logic</th><th>Actions</th></tr></thead>
        <tbody>
          {strategies.map(s => (
            <tr key={s.id}>
              <td>{s.provider_id}</td><td>{s.virtual_model_name}</td><td>{s.strategy_logic}</td>
              <td><button onClick={() => handleDelete(s.id)} disabled={isLoading}>Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Form for creating a new strategy */}
      <div style={{ background: '#f0fff0', padding: '1rem', marginTop: '1rem' }}>
        <h3>Add New Strategy</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
          <select value={newStrategy.provider_id} onChange={e => setNewStrategy({...newStrategy, provider_id: e.target.value})}>
            <option value="">-- Select Provider --</option>
            {allProviders.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input placeholder="Virtual Model Name (e.g., @auto)" value={newStrategy.virtual_model_name} onChange={e => setNewStrategy({...newStrategy, virtual_model_name: e.target.value})} />
          <select value={newStrategy.strategy_logic} onChange={e => setNewStrategy({...newStrategy, strategy_logic: e.target.value})}>
            <option value="quality_threshold">Quality Threshold</option>
            <option value="lowest_cost">Lowest Cost</option>
          </select>
        </div>
        
        {newStrategy.provider_id && (
            <div style={{marginTop: '1rem'}}>
                <h4>Candidate Models for this Strategy</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                    {availableModelsForProvider.map(model => (
                        <label key={model.id}>
                            <input type="checkbox" checked={selectedModelIds.includes(model.id)} onChange={() => handleCheckboxChange(model.id)} />
                            {model.model_name}
                        </label>
                    ))}
                </div>
            </div>
        )}

        <button onClick={handleCreate} disabled={isLoading} style={{marginTop: '1rem'}}>{isLoading ? 'Creating...' : 'Create Strategy'}</button>
      </div>
    </div>
  );
}