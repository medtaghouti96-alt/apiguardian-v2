'use client';
import { useState } from 'react';

// A simple type for our model data
type Model = {
  id: string;
  provider: { name: string };
  model_name: string;
  input_cost_per_million_tokens: number;
  output_cost_per_million_tokens: number;
};

export default function AdminModelManager({ initialModels, providers }: { initialModels: Model[], providers: any[] }) {
  const [models, setModels] = useState(initialModels);
  
  // This function is not used yet, so we can comment it out.
  // const refreshData = async () => { ... };

  const handleDelete = async (modelId: string) => {
    if (!confirm('Are you sure you want to delete this model?')) return;
    console.log(`TODO: Call API to delete model ${modelId}`);
  };

  return (
    <div>
      <table style={{ width: '100%', marginTop: '2rem', borderCollapse: 'collapse' }}>
        <thead>
          {/* ... table headers ... */}
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
      <hr style={{marginTop: '2rem'}} />
      {/* We will add the Edit and Create forms here later */}
    </div>
  );
}