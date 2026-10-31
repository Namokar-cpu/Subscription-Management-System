import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSubscriptions } from '../api/billing.js';
import CustomerOnly from '../components/CustomerOnly.jsx';
import PageHeader from '../components/PageHeader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { EmptyState, ErrorState, Loading } from '../components/States.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const money = (value, currency) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: currency || 'INR', maximumFractionDigits: 2 }).format(Number(value || 0));
const date = (value) => value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not started';

export default function SubscriptionsPage() {
  const { token, user } = useAuth();
  const [items, setItems] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = useCallback(async () => { if (user?.role !== 'CUSTOMER') { setLoading(false); return; } setLoading(true); setError(''); try { setItems((await getSubscriptions(token)).data); } catch (e) { setError(e.message); } finally { setLoading(false); } }, [token, user?.role]);
  useEffect(() => { load(); }, [load]);
  return <CustomerOnly><PageHeader eyebrow="YOUR ACCOUNT" title="Subscriptions" description="Review your plan, status, and billing dates." action={<Link className="button button-primary" to="/app/plans">Explore plans</Link>} />{loading ? <Loading/> : error ? <ErrorState error={error} onRetry={load}/> : items.length ? <section className="panel"><div className="table-scroll"><table><thead><tr><th>Plan</th><th>Reference</th><th>Amount</th><th>Status</th><th>Started</th><th>Next billing</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><strong>{item.plan.name}</strong><small className="table-subline">{item.plan.intervalCount} {item.plan.billingUnit.toLowerCase()}{item.plan.intervalCount > 1 ? 's' : ''}</small></td><td>{item.number}</td><td className="amount-cell">{money(item.grandTotal, item.currency)}</td><td><StatusBadge status={item.status}/></td><td>{date(item.startDate)}</td><td>{date(item.nextBillingDate)}</td></tr>)}</tbody></table></div></section> : !error && <EmptyState title="No subscriptions yet" detail="When you choose a plan, your subscription will show up here." action={<Link className="button button-primary" to="/app/plans">Browse plans</Link>}/>}</CustomerOnly>;
}
