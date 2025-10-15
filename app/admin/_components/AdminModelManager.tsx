'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Model = { id: string; provider_id: string; model_name: string; input_cost_per_million_tokens: number; output_cost_per_million_tokens: number; context_window: number; quality_tier: string; provider: { name: string } };
type Provider = { id: string; name: string; };

const newModelInitialState = { provider_id: '', model_name: '', input_cost_per_million_tokens: 0, output_cost_per_million_tokens: 0, context_window: 8192, quality_tier: 'medium', supports_images: false, speed_tier: 'standard', prompt_tokens_key: 'prompt_tokens', completion_tokens_key: 'completion_tokens', is_active: true };

export default function AdminModelManager({ initialModels, providers }: { initialModels: Model[], providers: Provider[] }) {
  const [models, setModels] = useState(initialModels);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [newModel, setNewModel] = useState(newModelInitialState);
  
  const refreshData = () => router.refresh();

  const handleUpdate = async () => {
    if (!editingModel) return;
    setIsLoading(true);
    const res = await fetch(`/api/admin/update-model`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            modelId: editingModel.id, 
            inputCost: editingModel.input_cost_per_million_tokens, 
            outputCost: editingModel.output_cost_per_million_tokens,
            contextWindow: editingModel.context_window,
            qualityTier: editingModel.quality_tier,
        })
    });
    const data = await res.json();
    setMessage(data.message || data.error);
    if(res.ok) { setEditingModel(null); refreshData(); }
    setIsLoading(false);
  };

  const handleCreate = async () => {
    setIsLoading(true);
    const res = await fetch(`/api/admin/create-model`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newModel)
    });
    const data = await res.json();
    setMessage(data.message || data.error);
    if(res.ok) { setNewModel(newModelInitialState); refreshData(); }
    setIsLoading(false);
  };

  const handleDelete = async (modelId: string) => {
    if (!confirm('Are you sure?')) return;
    setIsLoading(true);
    const res = await fetch(`/api/admin/delete-model`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId })
    });
    const data = await res.json();
    setMessage(data.message || data.error);
    if(res.ok) { refreshData(); }
    setIsLoading(false);
  };

  return (
    <div style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '8px' }}>
      <h2>Models</h2>
      {message && <p style={{background: '#eee', padding: '1rem'}}><strong>Status:</strong> {message}</p>}
      
      <table style={{ width: '100%', marginTop: '1rem', borderCollapse: 'collapse', fontSize: '0.9em' }}>
        <thead><tr style={{textAlign: 'left'}}><th>Provider</th><th>Model Name</th><th>Input Cost</th><th>Output Cost</th><th>Actions</th></tr></thead>
        <tbody>
          {models.map(model => (
            <tr key={model.id}>
              <td>{model.provider.name}</td><td>{model.model_name}</td>
              <td>{model.input_cost_per_million_tokens}</td><td>{model.output_cost_per_million_tokens}</td>
              <td>
                <button onClick={() => setEditingModel(model)}>Edit</button>
                <button onClick={() => handleDelete(model.id)} disabled={isLoading}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editingModel && (
        <div style={{ background: '#f0f8ff', padding: '1rem', marginTop: '1rem' }}>
          <h3>Editing: {editingModel.model_name}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div><label>Input Cost (/1M)</label><input type="number" value={editingModel.input_cost_per_million_tokens} onChange={e => setEditingModel({...editingModel, input_cost_per_million_tokens: Number(e.target.value)})} /></div>
            <div><label>Output Cost (/1M)</label><input type="number" value={editingModel.output_cost_per_million_tokens} onChange={e => setEditingModel({...editingModel, output_cost_per_million_tokens: Number(e.target.value)})} /></div>
            <div><label>Context Window</label><input type="number" value={editingModel.context_window} onChange={e => setEditingModel({...editingModel, context_window: Number(e.target.value)})} /></div>
            <div><label>Quality Tier</label><select value={editingModel.quality_tier} onChange={e => setEditingModel({...editingModel, quality_tier: e.target.value})}>
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="premium">Premium</option>
            </select></div>
          </div>
          <button onClick={handleUpdate} disabled={isLoading} style={{marginTop: '1rem'}}>Save Changes</button>
          <button onClick={() => setEditingModel(null)} disabled={isLoading}>Cancel</button>
        </div>
      )}

      <div style={{ background: '#f0fff0', padding: '1rem', marginTop: '1rem' }}>
        <h3>Add New Model</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <select value={newModel.provider_id} onChange={e => setNewModel({...newModel, provider_id: e.target.value})}>
              <option value="">-- Select Provider --</option>
              {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input placeholder="Model Name (e.g., gpt-5-turbo)" value={newModel.model_name} onChange={e => setNewModel({...newModel, model_name: e.target.value})} />
            <input type="number" placeholder="Input Cost / 1M" value={newModel.input_cost_per_million_tokens} onChange={e => setNewModel({...newModel, input_cost_per_million_tokens: Number(e.target.value)})} />
            <input type="number" placeholder="Output Cost / 1M" value={newModel.output_cost_per_million_tokens} onChange={e => setNewModel({...newModel, output_cost_per_million_tokens: Number(e.target.value)})} />
        </div>
        <button onClick={handleCreate} disabled={isLoading} style={{marginTop: '1rem'}}>Create New Model</button>
      </div>
    </div>
  );
}