import { useCallback, useEffect, useState } from 'react';
import { getAdminDashboard } from '../api/admin.js';
import AdminOnly from '../components/AdminOnly.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { ErrorState, Loading } from '../components/States.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const money = (value, currency) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: currency || 'INR', maximumFractionDigits: 0 }).format(Number(value || 0));

export default function AnalyticsPage() {
  const { token } = useAuth(); const [data,setData] = useState(null); const [loading,setLoading] = useState(true); const [error,setError] = useState('');
  const load = useCallback(async () => { setLoading(true); setError(''); try { setData((await getAdminDashboard(token)).data); } catch (e) { setError(e.message); } finally { setLoading(false); } },[token]);
  useEffect(() => { load(); },[load]);
  return <AdminOnly><PageHeader eyebrow="BUSINESS INSIGHTS" title="Analytics" description="Revenue, subscription status, and collection activity from saved records."/>{loading ? <Loading label="Loading analytics…"/> : error ? <ErrorState error={error} onRetry={load}/> : data && <div className="analytics-grid">
    <section className="panel analytics-panel"><div className="panel-heading"><div><span className="section-kicker">REVENUE</span><h2>Collected by month</h2></div><span className="chart-period">Last 6 months</span></div><RevenueChart rows={data.revenueByMonth}/></section>
    <section className="panel analytics-panel"><div className="panel-heading"><div><span className="section-kicker">SUBSCRIPTIONS</span><h2>Status distribution</h2></div></div><div className="distribution-list">{data.subscriptionStatuses.length ? data.subscriptionStatuses.map((item) => { const total = data.subscriptionStatuses.reduce((sum, row) => sum + row.count,0) || 1; return <div className="distribution-row" key={item.status}><div><span>{item.status.toLowerCase().replaceAll('_',' ')}</span><strong>{item.count}</strong></div><div className="distribution-track"><i style={{width:`${Math.max(item.count ? 3 : 0,item.count/total*100)}%`}}/></div></div>; }) : <p className="empty-inline">No subscription records are available yet.</p>}</div></section>
    <section className="panel analytics-panel"><div className="panel-heading"><div><span className="section-kicker">ACTIVE PLANS</span><h2>Subscription value by plan</h2></div></div>{data.revenueByPlan.length ? <div className="plan-revenue-list">{data.revenueByPlan.map((item) => <div className="plan-revenue-row" key={`${item.planId}-${item.currency}`}><span>{item.plan}</span><strong>{money(item.amount,item.currency)}</strong><small>{item.currency} · active subscription total</small></div>)}</div> : <p className="empty-inline">Active plan revenue will appear when subscriptions are active.</p>}</section>
    <section className="panel analytics-panel"><div className="panel-heading"><div><span className="section-kicker">PAYMENT OUTCOMES</span><h2>Verified success rate</h2></div></div><div className="success-rate-card"><strong>{data.metrics.paymentSuccessRate == null ? '—' : `${(data.metrics.paymentSuccessRate*100).toFixed(1)}%`}</strong><p>Captured payments divided by captured and failed attempts.</p><small>Pending attempts are excluded.</small></div></section>
  </div>}</AdminOnly>;
}

function RevenueChart({ rows }) {
  const currencies = [...new Set(rows.flatMap((row) => Object.keys(row.values)))];
  const currency = currencies[0] || 'INR';
  const values = rows.map((row) => Number(row.values[currency] || 0)); const max = Math.max(...values,1);
  if (!values.some((value) => value > 0)) return <div className="chart-empty"><span>↗</span><strong>No verified payments yet</strong><p>Complete a customer checkout to populate this chart.</p></div>;
  return <div className="chart-wrap"><div className="chart-values">{values.map((value,i) => <div key={rows[i].month}><span>{money(value,currency)}</span><i style={{height:`${Math.max(3,Math.round(value/max*100))}%`}}/></div>)}</div><div className="chart-labels">{rows.map((row) => <span key={row.month}>{row.month}</span>)}</div><small className="chart-caption">Recorded, verified payments · {currencies.length > 1 ? `Showing ${currency}; amounts remain grouped by currency.` : currency}</small></div>;
}
