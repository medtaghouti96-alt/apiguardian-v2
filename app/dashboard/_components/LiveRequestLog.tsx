// File: app/dashboard/_components/LiveRequestLog.tsx
'use client';
import useSWR from 'swr';

// --- THE FIX IS HERE ---
// We define our own simple type for a log entry instead of importing it.
// This decouples our frontend from the auto-generated Supabase types.
interface ApiLog {
  id: string;
  created_at: string;
  model: string;
  status_code: number;
  cost: number;
  latency_ms: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function LiveRequestLog() {
  // Use SWR to fetch data from our new API endpoint and poll every 5 seconds.
  // We tell SWR to expect an array of our ApiLog type.
  const { data: logs, error, isLoading } = useSWR<ApiLog[]>('/api/logs', fetcher, { 
    refreshInterval: 5000 
  });

  if (error) return <div>Failed to load logs.</div>
  if (isLoading) return <div>Loading logs...</div>

  return (
    <div>
      <h4 style={{ marginTop: '2rem' }}>Live Request Log (updates every 5s)</h4>
      <div style={{ overflowX: 'auto', border: '1px solid #eee', borderRadius: '8px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9em' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #ccc', background: '#f9f9f9' }}>
              <th style={{ padding: '0.75rem' }}>Timestamp</th>
              <th style={{ padding: '0.75rem' }}>Model</th>
              <th style={{ padding: '0.75rem' }}>Status</th>
              <th style={{ padding: '0.75rem' }}>Latency</th>
              <th style={{ padding: '0.75rem' }}>Cost (USD)</th>
            </tr>
          </thead>
          <tbody>
            {logs && logs.length > 0 ? logs.map((log) => (
              <tr key={log.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '0.75rem' }}>{new Date(log.created_at).toLocaleTimeString()}</td>
                <td style={{ padding: '0.75rem' }}>{log.model}</td>
                <td style={{ padding: '0.75rem' }}>{log.status_code}</td>
                <td style={{ padding: '0.75rem' }}>{log.latency_ms}ms</td>
                <td style={{ padding: '0.75rem' }}>${Number(log.cost).toFixed(6)}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} style={{ padding: '1rem', textAlign: 'center' }}>
                  No requests yet. Send a request through your proxy to see it here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}