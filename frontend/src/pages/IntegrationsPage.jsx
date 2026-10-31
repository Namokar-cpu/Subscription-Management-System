import { useCallback, useEffect, useState } from 'react';
import { getIntegrations } from '../api/admin.js';
import AdminOnly from '../components/AdminOnly.jsx';
import PageHeader from '../components/PageHeader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { ErrorState, Loading } from '../components/States.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function IntegrationsPage() {
  const { token } = useAuth(); const [items,setItems] = useState([]); const [loading,setLoading] = useState(true); const [error,setError] = useState('');
  const load = useCallback(async () => { setLoading(true); setError(''); try { setItems((await getIntegrations(token)).data); } catch (e) { setError(e.message); } finally { setLoading(false); } },[token]);
  useEffect(() => { load(); },[load]);
  return <AdminOnly><PageHeader eyebrow="CONNECTED SERVICES" title="Integrations" description="Status reflects server configuration only. Secret values are never returned to the browser."/>{loading ? <Loading label="Checking integration status…"/> : error ? <ErrorState error={error} onRetry={load}/> : <div className="integration-manage-grid">{items.map((item) => <article className="panel integration-manage-card" key={item.id}><div className="integration-manage-head"><span className="integration-mark">{item.name.slice(0,1)}</span><StatusBadge status={item.status}/></div><span className="section-kicker">{item.category.toUpperCase()}</span><h2>{item.name}</h2><p>{item.detail}</p><small>{item.status === 'configured' ? 'Configured in backend environment' : 'Add configuration on the backend to enable'}</small></article>)}</div>}</AdminOnly>;
}
