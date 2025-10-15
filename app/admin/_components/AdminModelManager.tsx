'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Define our data types
type Model = { id: string; provider_id: string; model_name: string; input_cost_per_million_tokens: number; output_cost_per_million_tokens: number; context_window: number; quality_tier: string; provider: { name: string } };
type Provider = { id: string; name: string; };

const newModelInitialState = { provider_id: '', model_name: '', input_cost_per_million_tokens: 0, output_cost_per_million_tokens: 0, context_window: 8192, quality_tier: 'medium' };

export default function AdminModelManager({ initialModels, providers }: { initialModels: Model[], providers: Provider[] }) {
  const [models, setModels] = useState(initialModels);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [newModel, setNewModel] = useState(newModelInitialState);

  // When a user clicks 'Edit', populate the editing form
  useEffect(() => {
    if (editingModel) {
      const fullModel = models.find(m => m.id === editingModel.id);
      if(fullModel) setEditingModel(fullModel);
    }
  }, [editingModel, models]);

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
    if(res.ok) { setEditingModel(null); router.refresh(); }
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
    if(res.ok) { setNewModel(newModelInitialState); router.refresh(); }
    setIsLoading(false);
  };

  const handleDelete = async (modelId: string) => {
    if (!confirm('Are you sure you want to delete this model? This cannot be undone.')) return;
    setIsLoading(true);
    const res = await fetch(`/api/admin/delete-model`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId })
    });
    const data = await res.json();
    setMessage(data.message || data.error);
    if(res.ok) { router.refresh(); }
    setIsLoading(false);
  };

  return (
    <div>
      {message && <p style={{background: '#eee', padding: '1rem'}}><strong>Status:</strong> {message}</p>}
      
      {/* Table of existing models */}
      <table style={{ width: '100%', marginTop: '1rem', borderCollapse: 'collapse' }}>
        <thead>
            <tr style={{ textAlign: 'left' }}>
                <th>Provider</th><th>Model Name</th><th>Input Cost</th><th>Output Cost</th><th>Context</th><th>Quality</th><th>Actions</th>
            </tr>
        </thead>
        <tbody>
          {models.map(model => (
            <tr key={model.id}>
              <td>{model.provider.name}</td><td>{model.model_name}</td>
              <td>{model.input_cost_per_million_tokens}</td><td>{model.output_cost_per_million_tokens}</td>
              <td>{model.context_window}</td><td>{model.quality_tier}</td>
              <td>
                <button onClick={() => setEditingModel(model)}>Edit</button>
                <button onClick={() => handleDelete(model.id)} disabled={isLoading}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <hr />

      {/* EDIT FORM */}
      {editingModel && (
        <div style={{ background: '#f0f8ff', padding: '1rem' }}>
          <h3>Editing: {editingModel.model_name}</h3>
          {/* ... inputs for editingModel state ... */}
          <button onClick={handleUpdate} disabled={isLoading}>{isLoading ? 'Saving...' : 'Save Changes'}</button>
          <button onClick={() => setEditingModel(null)} disabled={isLoading}>Cancel</button>
        </div>
      )}

      {/* CREATE FORM */}
      <div style={{ background: '#f0fff0', padding: '1rem', marginTop: '1rem' }}>
        <h3>Add New Model</h3>
        {/* ... inputs for newModel state ... */}
        <button onClick={handleCreate} disabled={isLoading}>{isLoading ? 'Saving...' : 'Create New Model'}</button>
      </div>
    </div>
  );
}