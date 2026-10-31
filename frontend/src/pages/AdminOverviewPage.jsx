import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAdminDashboard } from '../api/admin.js';
import Icon from '../components/Icon.jsx';
import PageHeader from '../components/PageHeader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { ErrorState, Loading } from '../components/States.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const money = (value, currency) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: currency || 'INR', maximumFractionDigits: 0 }).format(Number(value || 0));
const date = (value) => value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—';

export default function AdminOverviewPage() {
  const { token } = useAuth();
  const [data, setData] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = useCallback(async () => { setLoading(true); setError(''); try { setData((await getAdminDashboard(token)).data); } catch (e) { setError(e.message); } finally { setLoading(false); } }, [token]);
  useEffect(() => { load(); }, [load]);
  const activity = useMemo(() => {
    if (!data) return [];
    const payments = data.recentPayments.map((payment) => {
      const sample = payment.reference?.startsWith('DEMO-PAY-');
      return { id: `payment-${payment.id}`, type: 'payment', title: sample ? 'Sample payment' : 'Payment received', detail: `${payment.invoice.customer.companyName || payment.invoice.customer.name} · ${money(payment.amount, payment.invoice.currency)}`, at: payment.paidAt, sample };
    });
    const customers = (data.recentCustomers || []).map((customer) => {
      const sample = customer.companyName?.startsWith('Demo Company ');
      return { id: `customer-${customer.id}`, type: 'customer', title: sample ? 'Sample customer' : 'New customer', detail: customer.companyName || customer.name, at: customer.createdAt, sample };
    });
    const renewals = (data.renewalItems || []).map((subscription) => {
      const sample = subscription.number?.startsWith('DEMO-SUB-');
      return { id: `renewal-${subscription.id}`, type: 'renewal', title: sample ? 'Sample renewal' : 'Renewal upcoming', detail: `${subscription.customer.companyName || subscription.customer.name} · ${subscription.plan.name}`, at: subscription.nextBillingDate, sample };
    });
    return [...payments, ...customers, ...renewals].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 5);
  }, [data]);

  return <>
    <PageHeader eyebrow="BUSINESS OVERVIEW" title="Overview" description="A live view of subscriptions, billing, and payments in your account." action={<Link className="button button-primary" to="/app/plans">Manage plans <Icon name="arrow" size={16}/></Link>} />
    {loading ? <Loading label="Loading business metrics…"/> : error ? <ErrorState error={error} onRetry={load}/> : data && <>
      <div className="metric-grid admin-metrics overview-metrics">
        <Metric icon="card" label="MONTHLY RECURRING REVENUE" value={data.metrics.mrrByCurrency.length ? data.metrics.mrrByCurrency.map((item) => money(item.amount, item.currency)).join(' · ') : money(0,'INR')} note={data.metrics.activeSubscriptions ? 'Estimated from active plans' : 'No active subscriptions yet'}/>
        <Metric icon="users" label="ACTIVE SUBSCRIPTIONS" value={data.metrics.activeSubscriptions} note="Currently active"/>
        <Metric icon="users" label="CUSTOMERS" value={data.metrics.activeCustomers} note="Customer records"/>
      </div>
      {data.recentPayments.length === 0 && <section className="panel payment-flow-guide"><div className="payment-guide-heading"><span className="flow-notice-icon"><Icon name="card"/></span><div><span className="section-kicker">RAZORPAY PAYMENT FLOW</span><h2>Why payment activity is empty</h2><p>Razorpay charges a customer after they select a plan. Adding a product only adds it to your catalog.</p></div></div><div className="payment-steps"><div><span>01</span><strong>Set up a plan</strong><small>{data.metrics.activeProducts} active products · {data.metrics.activePlans} active plans</small><Link to="/app/plans">Review plans <Icon name="arrow" size={13}/></Link></div><div><span>02</span><strong>Use a customer account</strong><small>Sign out first, then register with a customer email and verify it.</small></div><div><span>03</span><strong>Complete checkout</strong><small>The verified payment activates the subscription and populates these dashboard cards.</small><Link to="/app/payments">View payments <Icon name="arrow" size={13}/></Link></div></div></section>}
      <div className="admin-dashboard-grid overview-dashboard-grid">
        <section className="panel analytics-panel overview-revenue-panel"><div className="panel-heading"><div><span className="section-kicker">REVENUE OVERVIEW</span><h2>Payments collected</h2></div><span className="chart-period">Last 6 months</span></div><RevenueChart rows={data.revenueByMonth}/></section>
        <section className="panel overview-activity-panel"><div className="panel-heading"><div><span className="section-kicker">LATEST ACTIVITY</span><h2>Recent activity</h2></div><Link className="inline-link" to="/app/payments">Payments <Icon name="arrow" size={15}/></Link></div>{activity.length ? <div className="activity-list">{activity.map((item) => <article className="activity-item" key={item.id}><span className={`activity-marker ${item.type}`}><Icon name={item.type === 'payment' ? 'check' : item.type === 'customer' ? 'users' : 'spark'} size={14}/></span><div className="activity-copy"><div className="activity-heading"><strong>{item.title}</strong>{item.sample && <span className="sample-tag">DEMO</span>}</div><small>{item.detail}</small></div><time dateTime={new Date(item.at).toISOString()}>{date(item.at)}</time></article>)}</div> : <div className="empty-inline">New customers, renewals, and payment activity will appear here.</div>}</section>
      </div>
      <div className="overview-summary-row"><Summary icon="receipt" label="OUTSTANDING INVOICES" value={data.metrics.outstandingInvoices}/><Summary icon="spark" label="UPCOMING RENEWALS" value={data.metrics.upcomingRenewals}/><Summary icon="check" label="PAYMENT SUCCESS RATE" value={data.metrics.paymentSuccessRate == null ? '—' : `${(data.metrics.paymentSuccessRate * 100).toFixed(1)}%`}/><div className="overview-integrations"><span className="section-kicker">CONNECTED SERVICES</span><span>Razorpay <StatusBadge status={data.integrationStatus.razorpayConfigured ? 'configured' : 'not configured'}/></span><span>Resend <StatusBadge status={data.integrationStatus.emailConfigured ? 'configured' : 'not configured'}/></span><Link className="inline-link" to="/app/integrations">Manage integrations <Icon name="arrow" size={14}/></Link></div></div>
    </>}
  </>;
}

function Metric({ icon, label, value, note }) {
  return <article className="metric-card"><span className="metric-label"><Icon name={icon} size={16}/>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

function Summary({ icon, label, value }) {
  return <article className="overview-summary-card"><span><Icon name={icon} size={15}/>{label}</span><strong>{value}</strong></article>;
}

function RevenueChart({ rows }) {
  const currencies = [...new Set(rows.flatMap((row) => Object.keys(row.values)))];
  const currency = currencies.length === 1 ? currencies[0] : null;
  const values = rows.map((row) => currency ? Number(row.values[currency] || 0) : Object.values(row.values).reduce((sum, amount) => sum + Number(amount), 0));
  const max = Math.max(...values, 1);
  if (!values.some((value) => value > 0)) return <div className="chart-empty"><span><Icon name="chart" size={19}/></span><strong>No verified payments yet</strong><p>Payment totals will appear here after a customer completes Razorpay checkout.</p></div>;
  const points = values.map((value, index) => ({ x: 30 + (index * 540 / Math.max(values.length - 1, 1)), y: 145 - (value / max * 112) }));
  const line = points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const previous = points[index - 1]; const third = (point.x - previous.x) / 3;
    return `${path} C ${previous.x + third} ${previous.y}, ${point.x - third} ${point.y}, ${point.x} ${point.y}`;
  }, '');
  const fill = `${line} L ${points.at(-1).x} 166 L ${points[0].x} 166 Z`;
  return <div className="chart-wrap"><svg className="overview-line-chart" viewBox="0 0 600 178" role="img" aria-label="Payment revenue over the last six months"><defs><linearGradient id="overviewRevenueFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--accent-primary)" stopOpacity=".25"/><stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0"/></linearGradient></defs><path d={fill} fill="url(#overviewRevenueFill)"/><path d={line} fill="none" stroke="var(--accent-primary)" strokeWidth="3" strokeLinecap="round"/><circle cx={points.at(-1).x} cy={points.at(-1).y} r="4" fill="var(--accent-primary)"/></svg><div className="chart-labels">{rows.map((row) => <span key={row.month}>{row.month}</span>)}</div><small className="chart-caption">Recorded payments only · {currency || (currencies.length ? 'Multiple currencies combined' : 'No payment data yet')}</small></div>;
}
