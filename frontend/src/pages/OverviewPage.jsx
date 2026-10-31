import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getInvoices, getSubscriptions } from '../api/billing.js';
import CustomerOnly from '../components/CustomerOnly.jsx';
import Icon from '../components/Icon.jsx';
import PageHeader from '../components/PageHeader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { EmptyState, ErrorState, Loading } from '../components/States.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import AdminOverviewPage from './AdminOverviewPage.jsx';

const money = (value, currency = 'INR') => new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(value || 0));
const date = (value) => value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export default function OverviewPage() {
  const { token, user } = useAuth();
  if (user?.role === 'ADMIN' || user?.role === 'STAFF') return <AdminOverviewPage/>;
  const [data, setData] = useState({ subscriptions: [], invoices: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (user?.role !== 'CUSTOMER') { setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const [subscriptions, invoices] = await Promise.all([getSubscriptions(token), getInvoices(token)]);
      setData({ subscriptions: subscriptions.data, invoices: invoices.data });
    } catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }, [token, user?.role]);
  useEffect(() => { load(); }, [load]);

  return <CustomerOnly><PageHeader eyebrow="YOUR ACCOUNT" title={`Welcome${user?.customer?.name ? `, ${user.customer.name.split(' ')[0]}` : ''}.`} description="Your subscriptions and billing, together in one place." action={<Link className="button button-primary" to="/app/plans">Explore plans <Icon name="arrow" size={16}/></Link>} />
    {loading ? <Loading label="Loading your account data…"/> : error ? <ErrorState error={error} onRetry={load}/> : <>
      <div className="metric-grid customer-metrics"><article className="metric-card"><span className="metric-label"><Icon name="users" size={16}/> ACTIVE SUBSCRIPTIONS</span><strong>{data.subscriptions.filter((item) => item.status === 'ACTIVE').length}</strong><small>From your account</small></article><article className="metric-card"><span className="metric-label"><Icon name="receipt" size={16}/> OPEN INVOICES</span><strong>{data.invoices.filter((item) => Number(item.balanceDue) > 0).length}</strong><small>With an outstanding balance</small></article><article className="metric-card"><span className="metric-label"><Icon name="card" size={16}/> OUTSTANDING BALANCE</span><strong>{money(data.invoices.reduce((sum, item) => sum + Number(item.balanceDue), 0))}</strong><small>Across your invoices</small></article></div>
      <div className="workspace-columns"><section className="panel"><div className="panel-heading"><div><span className="section-kicker">BILLING</span><h2>Recent invoices</h2></div><Link className="inline-link" to="/app/invoices">All invoices <Icon name="arrow" size={15}/></Link></div>{data.invoices.length ? <div className="table-scroll"><table><thead><tr><th>Invoice</th><th>Issued</th><th>Amount</th><th>Status</th></tr></thead><tbody>{data.invoices.slice(0,5).map((invoice) => <tr key={invoice.id}><td><Link className="table-link" to="/app/invoices">{invoice.number}</Link></td><td>{date(invoice.createdAt)}</td><td className="amount-cell">{money(invoice.total, invoice.currency)}</td><td><StatusBadge status={invoice.status}/></td></tr>)}</tbody></table></div> : <EmptyState title="No invoices yet" detail="Invoices for subscriptions you start will appear here." action={<Link className="button button-outline button-small" to="/app/plans">Browse plans</Link>}/>}</section>
        <section className="panel"><div className="panel-heading"><div><span className="section-kicker">YOUR PLANS</span><h2>Subscriptions</h2></div><Link className="inline-link" to="/app/subscriptions">View all <Icon name="arrow" size={15}/></Link></div>{data.subscriptions.length ? <div className="subscription-list">{data.subscriptions.slice(0,4).map((item) => <div className="subscription-row" key={item.id}><span className="plan-icon"><Icon name="spark" size={17}/></span><div className="subscription-copy"><strong>{item.plan.name}</strong><small>{item.number} · {item.plan.intervalCount} {item.plan.billingUnit.toLowerCase()}{item.plan.intervalCount > 1 ? 's' : ''}</small></div><StatusBadge status={item.status}/></div>)}</div> : <EmptyState title="No subscriptions yet" detail="Choose a plan to start your first subscription." action={<Link className="button button-primary button-small" to="/app/plans">Explore plans</Link>}/>}</section></div>
    </>}
  </CustomerOnly>;
}
