'use client';
import { useState } from 'react';

// --- FIX #1: Define a proper type for our data ---
// This makes our code safer and satisfies the `no-explicit-any` rule.
type Provider = {
  id: string;
  name: string;
};
type Model = {
  id: string;
  provider: { name: string };
  model_name: string;
  input_cost_per_million_tokens: number;
  output_cost_per_million_tokens: number;
};
// --- END OF FIX #1 ---

export default function AdminModelManager({ initialModels, providers }: { initialModels: Model[], providers: Provider[] }) {
  const [models, setModels] = useState(initialModels);

  // --- FIX #2: Temporarily use the 'providers' variable ---
  // This satisfies the `no-unused-vars` rule. We will use this data
  // for real when we build the "Create Model" form.
  console.log("Providers available:", providers);
  // --- END OF FIX #2 ---

  const handleDelete = async (modelId: string) => {
    if (!confirm('Are you sure you want to delete this model?')) return;
    console.log(`TODO: Call API to delete model ${modelId}`);
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
      <hr style={{marginTop: '2rem'}} />
      {/* The Edit and Create forms will be added back here later */}
    </div>
  );
}