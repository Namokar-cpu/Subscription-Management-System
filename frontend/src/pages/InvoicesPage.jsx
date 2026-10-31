import { useCallback, useEffect, useState } from 'react';
import { downloadInvoice, getInvoices } from '../api/billing.js';
import CustomerOnly from '../components/CustomerOnly.jsx';
import Icon from '../components/Icon.jsx';
import PageHeader from '../components/PageHeader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { EmptyState, ErrorState, Loading } from '../components/States.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const money = (value, currency) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: currency || 'INR', maximumFractionDigits: 2 }).format(Number(value || 0));
const date = (value) => value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export default function InvoicesPage() {
  const { token, user } = useAuth();
  const [items, setItems] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [downloading, setDownloading] = useState('');
  const load = useCallback(async () => { if (user?.role !== 'CUSTOMER') { setLoading(false); return; } setLoading(true); setError(''); try { setItems((await getInvoices(token)).data); } catch (e) { setError(e.message); } finally { setLoading(false); } }, [token, user?.role]);
  useEffect(() => { load(); }, [load]);
  const save = async (item) => { setDownloading(item.id); setError(''); try { await downloadInvoice(item.id, item.number, token); } catch (e) { setError(e.message); } finally { setDownloading(''); } };
  return <CustomerOnly><PageHeader eyebrow="YOUR ACCOUNT" title="Invoices" description="View the invoices issued to your account and download a copy." />{loading ? <Loading label="Loading invoice history…"/> : error && !items.length ? <ErrorState error={error} onRetry={load}/> : items.length ? <><section className="panel">{error && <ErrorState error={error}/>}<div className="table-scroll"><table><thead><tr><th>Invoice</th><th>Subscription</th><th>Issued</th><th>Total</th><th>Balance due</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><strong>{item.number}</strong></td><td>{item.subscription?.plan?.name || 'One-time invoice'}</td><td>{date(item.createdAt)}</td><td className="amount-cell">{money(item.total, item.currency)}</td><td>{money(item.balanceDue, item.currency)}</td><td><StatusBadge status={item.status}/></td><td><button className="icon-button download-button" aria-label={`Download ${item.number}`} title="Download invoice PDF" disabled={Boolean(downloading)} onClick={() => save(item)}>{downloading === item.id ? <span className="spinner spinner-small"/> : <Icon name="receipt" size={17}/>}</button></td></tr>)}</tbody></table></div></section><p className="data-note"><Icon name="lock" size={14}/> Invoice data is limited to your signed-in account.</p></> : <EmptyState title="No invoices to show" detail="Invoices will appear here when a subscription is created."/>}</CustomerOnly>;
}
