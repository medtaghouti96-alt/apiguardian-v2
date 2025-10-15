// File: app/admin/_components/AdminModelManager.tsx
'use client';
import { useState } from 'react';

// A simple type for our model data
type Model = {
  id: string;
  provider: { name: string };
  model_name: string;
  input_cost_per_million_tokens: number;
  output_cost_per_million_tokens: number;
  // Add other fields as needed
};

export default function AdminModelManager({ initialModels, providers }: { initialModels: Model[], providers: any[] }) {
  const [models, setModels] = useState(initialModels);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  // This is a simple way to refresh data on the client side
  const refreshData = async () => {
    const res = await fetch('/api/admin/get-models'); // We'll create this API
    if (res.ok) {
      const newModels = await res.json();
      setModels(newModels);
    }
  };

  const handleDelete = async (modelId: string) => {
    if (!confirm('Are you sure you want to delete this model?')) return;
    
    // TODO: Call a new API endpoint /api/admin/delete-model
    console.log(`Deleting model ${modelId}`);
    // After deleting, refresh the list
    // await refreshData();
  };

  return (
    <div>
      <table style={{ width: '100%', marginTop: '2rem', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>
            <th>Provider</th>
            <th>Model Name</th>
            <th>Input Cost (/1M)</th>
            <th>Output Cost (/1M)</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {models.map(model => (
            <tr key={model.id} style={{ borderBottom: '1px solid #eee' }}>
              <td>{model.provider.name}</td>
              <td>{model.model_name}</td>
              <td>{model.input_cost_per_million_tokens}</td>
              <td>{model.output_cost_per_million_tokens}</td>
              <td>
                <button onClick={() => handleDelete(model.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* We can re-use the forms we designed before for Editing and Creating */}
      {/* For simplicity, let's assume they are built here for now */}
      <hr style={{marginTop: '2rem'}} />
      {/* <EditModelForm models={models} onSave={refreshData} /> */}
      {/* <CreateModelForm providers={providers} onSave={refreshData} /> */}
    </div>
  );
}