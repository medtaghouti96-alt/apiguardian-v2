'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Define specific types to avoid 'any'
type StrategyParams = { threshold?: number; low_tier_model_id?: string; high_tier_model_id?: string };
type Strategy = { id: string; provider_id: string; virtual_model_name: string; strategy_logic: string; strategy_params: StrategyParams; description: string | null; strategy_models: { model_id: string }[] };
type Model = { id: string; provider_id: string; model_name: string; };
type Provider = { id: string; name: string; };

const newStrategyInitialState: { provider_id: string; virtual_model_name: string; strategy_logic: string; strategy_params: StrategyParams; description: string } = {
  provider_id: '', virtual_model_name: '', strategy_logic: 'quality_threshold', strategy_params: { threshold: 2000 }, description: ''
};

export default function AdminStrategyManager({ initialStrategies, allModels, allProviders }: { initialStrategies: Strategy[], allModels: Model[], allProviders: Provider[] }) {
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
    if (res.ok) { setNewStrategy(newStrategyInitialState); setSelectedModelIds([]); refreshData(); }
    setIsLoading(false);
  };

  const handleDelete = async (strategyId: string) => { /* ... same as before ... */ };

  const handleCheckboxChange = (modelId: string) => { /* ... same as before ... */ };
  
  const availableModelsForProvider = allModels.filter(m => m.provider_id === newStrategy.provider_id);

  return (
    <div style={{ border: '1px solid #ddd', padding: '1rem', borderRadius: '8px', marginTop: '2rem' }}>
      <h2>Smart Routing Strategies</h2>
      {message && <p><strong>Status:</strong> {message}</p>}

      {/* ... (table to display strategies) ... */}

      <div style={{ background: '#f0fff0', padding: '1rem', marginTop: '1rem' }}>
        <h3>Add New Strategy</h3>
        {/* ... (form elements) ... */}
        {/* Example for threshold param */}
        {newStrategy.strategy_logic === 'quality_threshold' && (
          <input 
            type="number"
            placeholder="Token Threshold"
            value={newStrategy.strategy_params.threshold || 2000}
            onChange={e => setNewStrategy({...newStrategy, strategy_params: {...newStrategy.strategy_params, threshold: Number(e.target.value)} })}
          />
        )}
      </div>
    </div>
  );
}