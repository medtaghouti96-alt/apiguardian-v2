// File: app/dashboard/_components/UserRulesManager.tsx
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Define our data types
type Rule = { id: string; project_id: string; rule_type: string; budget_usd: number; };
const newRuleInitialState = { rule_type: '', budget_usd: 0 };

export default function UserRulesManager({ projectId, initialRules }: { projectId: string, initialRules: Rule[] }) {
  const [rules, setRules] = useState(initialRules);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [newRule, setNewRule] = useState(newRuleInitialState);
  
  const refreshData = () => router.refresh();

  const handleCreate = async () => {
    setIsLoading(true);
    const res = await fetch(`/api/projects/${projectId}/rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRule)
    });
    const data = await res.json();
    setMessage(data.message || data.error);
    if (res.ok) { setNewRule(newRuleInitialState); refreshData(); }
    setIsLoading(false);
  };

  const handleUpdate = async () => {
    if (!editingRule) return;
    setIsLoading(true);
    const res = await fetch(`/api/projects/${projectId}/rules/${editingRule.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ budget_usd: Number(editingRule.budget_usd) })
    });
    const data = await res.json();
    setMessage(data.message || data.error);
    if (res.ok) { setEditingRule(null); refreshData(); }
    setIsLoading(false);
  };

  const handleDelete = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;
    setIsLoading(true);
    const res = await fetch(`/api/projects/${projectId}/rules/${ruleId}`, { method: 'DELETE' });
    if (res.ok) {
      setMessage('Rule deleted successfully.');
      refreshData();
    } else {
      const data = await res.json();
      setMessage(data.error || 'Failed to delete rule.');
    }
    setIsLoading(false);
  };

  return (
    <div style={{ marginTop: '1rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
      <h4>Per-User Budget Rules</h4>
      {message && <p style={{background: '#eee', padding: '0.5rem', borderRadius: '4px'}}><strong>Status:</strong> {message}</p>}
      
      <table style={{width: '100%', borderCollapse: 'collapse'}}>
        <thead><tr style={{textAlign: 'left'}}><th>Tier Name / Rule Type</th><th>Budget (USD)</th><th>Actions</th></tr></thead>
        <tbody>
          {rules.map(rule => (
            <tr key={rule.id}>
              <td>{editingRule?.id === rule.id ? <input value={editingRule.rule_type} readOnly disabled/> : rule.rule_type}</td>
              <td>{editingRule?.id === rule.id ? <input type="number" value={editingRule.budget_usd} onChange={e => setEditingRule({...editingRule, budget_usd: Number(e.target.value)})}/> : `$${rule.budget_usd}`}</td>
              <td>
                {editingRule?.id === rule.id ? (
                  <>
                    <button onClick={handleUpdate} disabled={isLoading}>Save</button>
                    <button onClick={() => setEditingRule(null)} disabled={isLoading}>Cancel</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setEditingRule(rule)} disabled={isLoading}>Edit</button>
                    <button onClick={() => handleDelete(rule.id)} disabled={isLoading}>Delete</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Form for creating a new rule */}
      <div style={{ background: '#f0fff0', padding: '1rem', marginTop: '1rem' }}>
        <h5>Add New Rule</h5>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <input placeholder="Tier Name (e.g., free-plan)" value={newRule.rule_type} onChange={e => setNewRule({...newRule, rule_type: e.target.value})} />
          <input type="number" placeholder="Budget (e.g., 0.50)" value={newRule.budget_usd} onChange={e => setNewRule({...newRule, budget_usd: Number(e.target.value)})} />
          <button onClick={handleCreate} disabled={isLoading}>{isLoading ? 'Adding...' : 'Add Rule'}</button>
        </div>
      </div>
    </div>
  );
}