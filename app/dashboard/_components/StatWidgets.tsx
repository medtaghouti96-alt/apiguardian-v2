// File: app/dashboard/_components/StatWidgets.tsx
'use client';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function StatWidgets() {
  const { data, error, isLoading } = useSWR('/api/stats', fetcher);

  if (error) return <div>Failed to load stats.</div>
  if (isLoading) return <div>Loading...</div>

  return (
    <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
      <div style={{ border: '1px solid #eee', padding: '1rem', borderRadius: '8px' }}>
        <p style={{ margin: 0, color: '#666' }}>Current Month Spend</p>
        <p style={{ margin: '0.25rem 0 0', fontSize: '1.5rem', fontWeight: 'bold' }}>
          ${Number(data.total_cost).toFixed(4)}
        </p>
      </div>
      <div style={{ border: '1px solid #eee', padding: '1rem', borderRadius: '8px' }}>
        <p style={{ margin: 0, color: '#666' }}>Current Month Requests</p>
        <p style={{ margin: '0.25rem 0 0', fontSize: '1.5rem', fontWeight: 'bold' }}>
          {Number(data.total_requests).toLocaleString()}
        </p>
      </div>
    </div>
  );
}