import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAdminDashboard } from '../api/admin.js';
import Icon from '../components/Icon.jsx';
import PageHeader from '../components/PageHeader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { ErrorState, Loading } from '../components/States.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const money = (value, currency) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: currency || 'INR', maximumFractionDigits: 0 }).format(Number(value || 0));
const date = (value) => new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export default function AdminOverviewPage() {
  const { token } = useAuth();
  const [data, setData] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = useCallback(async () => { setLoading(true); setError(''); try { setData((await getAdminDashboard(token)).data); } catch (e) { setError(e.message); } finally { setLoading(false); } }, [token]);
  useEffect(() => { load(); }, [load]);
  return <>
    <PageHeader eyebrow="BUSINESS OVERVIEW" title="Overview" description="A live view of subscriptions, billing, and payments in your account." action={<Link className="button button-primary" to="/app/plans">Manage plans <Icon name="arrow" size={16}/></Link>} />
    {loading ? <Loading label="Loading business metrics…"/> : error ? <ErrorState error={error} onRetry={load}/> : data && <>
      <div className="metric-grid admin-metrics">
        <Metric icon="card" label="MONTHLY RECURRING REVENUE" value={data.metrics.mrrByCurrency.length ? data.metrics.mrrByCurrency.map((item) => money(item.amount, item.currency)).join(' · ') : money(0,'INR')} note="Estimated from active plans"/>
        <Metric icon="users" label="ACTIVE SUBSCRIPTIONS" value={data.metrics.activeSubscriptions} note="Currently active"/>
        <Metric icon="users" label="CUSTOMERS" value={data.metrics.activeCustomers} note="Customer records"/>
        <Metric icon="receipt" label="OUTSTANDING INVOICES" value={data.metrics.outstandingInvoices} note="With balance due"/>
        <Metric icon="chart" label="UPCOMING RENEWALS" value={data.metrics.upcomingRenewals} note="Next 30 days"/>
        <Metric icon="check" label="PAYMENT SUCCESS RATE" value={data.metrics.paymentSuccessRate == null ? '—' : `${(data.metrics.paymentSuccessRate * 100).toFixed(1)}%`} note={data.metrics.paymentSuccessRate == null ? 'No decided attempts yet' : 'Captured vs. failed attempts'}/>
      </div>
      <div className="admin-dashboard-grid"><section className="panel analytics-panel"><div className="panel-heading"><div><span className="section-kicker">REVENUE</span><h2>Payments collected</h2></div><span className="chart-period">Last 6 months</span></div><RevenueChart rows={data.revenueByMonth}/></section>
        <section className="panel integration-summary"><div className="panel-heading"><div><span className="section-kicker">CONNECTED SERVICES</span><h2>Integration status</h2></div><Link className="inline-link" to="/app/integrations">Manage <Icon name="arrow" size={15}/></Link></div><div className="integration-status-row"><span className="integration-mark">R</span><span><strong>Razorpay</strong><small>Online payments</small></span><StatusBadge status={data.integrationStatus.razorpayConfigured ? 'configured' : 'not configured'}/></div><div className="integration-status-row"><span className="integration-mark mark-4">R</span><span><strong>Resend</strong><small>Verification email</small></span><StatusBadge status={data.integrationStatus.emailConfigured ? 'configured' : 'not configured'}/></div></section>
        <section className="panel recent-panel"><div className="panel-heading"><div><span className="section-kicker">LATEST ACTIVITY</span><h2>Recent payments</h2></div><Link className="inline-link" to="/app/payments">All payments <Icon name="arrow" size={15}/></Link></div>{data.recentPayments.length ? <div className="table-scroll"><table><thead><tr><th>Customer</th><th>Invoice</th><th>Amount</th><th>Date</th><th>Method</th></tr></thead><tbody>{data.recentPayments.map((payment) => <tr key={payment.id}><td>{payment.invoice.customer.companyName || payment.invoice.customer.name}</td><td>{payment.invoice.number}</td><td className="amount-cell">{money(payment.amount,payment.invoice.currency)}</td><td>{date(payment.paidAt)}</td><td>{payment.method.replaceAll('_',' ')}</td></tr>)}</tbody></table></div> : <div className="empty-inline">No recorded payments yet. Payment activity will appear here after a verified transaction.</div>}</section>
      </div>
    </>}
  </>;
}

function Metric({ icon, label, value, note }) {
  return <article className="metric-card"><span className="metric-label"><Icon name={icon} size={16}/>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

function RevenueChart({ rows }) {
  const currencies = [...new Set(rows.flatMap((row) => Object.keys(row.values)))];
  const currency = currencies.length === 1 ? currencies[0] : null;
  const values = rows.map((row) => currency ? Number(row.values[currency] || 0) : Object.values(row.values).reduce((sum, amount) => sum + Number(amount), 0));
  const max = Math.max(...values, 1);
  return <div className="chart-wrap"><div className="chart-values">{values.map((value, i) => <div key={rows[i].month}><span>{money(value,currency || 'INR')}</span><i style={{height:`${Math.max(3,Math.round(value/max*100))}%`}}/></div>)}</div><div className="chart-labels">{rows.map((row) => <span key={row.month}>{row.month}</span>)}</div><small className="chart-caption">Recorded payments only · {currency || (currencies.length ? 'Multiple currencies combined' : 'No payment data yet')}</small></div>;
}
