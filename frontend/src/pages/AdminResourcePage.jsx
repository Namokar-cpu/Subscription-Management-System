import { useCallback, useEffect, useMemo, useState } from 'react';
import { downloadInvoice } from '../api/billing.js';
import { createAdmin, listAdmin, updateAdmin } from '../api/admin.js';
import AdminOnly from '../components/AdminOnly.jsx';
import Icon from '../components/Icon.jsx';
import PageHeader from '../components/PageHeader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { EmptyState, ErrorState, Loading } from '../components/States.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const definitions = {
  customers: { title: 'Customers', description: 'Customer records and their subscription activity.', canEdit: true, fields: [['name','Full name','text',true],['companyName','Company','text'],['billingEmail','Billing email','email'],['phone','Phone','tel'],['taxNumber','Tax number','text']], columns: [['name','Customer'],['companyName','Company'],['billingEmail','Billing email'],['subscriptionCount','Subscriptions'],['invoiceCount','Invoices'],['createdAt','Added']] },
  products: { title: 'Products', description: 'Products available to include in subscription plans.', canEdit: true, fields: [['name','Product name','text',true],['description','Description','text'],['type','Type','text'],['salesPrice','Price','number',true],['currency','Currency','text',true],['active','Available', 'checkbox']], columns: [['name','Product'],['type','Type'],['salesPrice','Price'],['currency','Currency'],['active','Status'],['createdAt','Created']] },
  plans: { title: 'Products & plans', description: 'Manage live plan pricing, billing intervals, and included products.', canEdit: true, fields: [['name','Plan name','text',true],['description','Description','text'],['price','Price','number',true],['currency','Currency','text',true],['billingUnit','Billing interval','select',true,['DAY','WEEK','MONTH','YEAR']],['intervalCount','Interval count','number',true],['active','Available','checkbox'],['allowRenewal','Allow renewal','checkbox'],['allowPause','Allow pause','checkbox']], columns: [['name','Plan'],['price','Price'],['billingUnit','Billing interval'],['products','Included products'],['subscriptionCount','Subscriptions'],['active','Status']] },
  subscriptions: { title: 'Subscriptions', description: 'Review customer plans and their current lifecycle status.', fields: [['status','Filter by status','select',false,['','DRAFT','CONFIRMED','ACTIVE','PAUSED','CANCELLED','EXPIRED']]], columns: [['number','Subscription'],['customer','Customer'],['plan','Plan'],['grandTotal','Amount'],['status','Status'],['startDate','Start date'],['nextBillingDate','Next billing']] },
  invoices: { title: 'Invoices', description: 'Review issued invoices and balances from customer payments.', fields: [['status','Filter by status','select',false,['','DRAFT','CONFIRMED','SENT','PARTIALLY_PAID','PAID','OVERDUE','VOID','CANCELLED']]], columns: [['number','Invoice'],['customer','Customer'],['plan','Subscription'],['total','Total'],['balanceDue','Balance due'],['status','Status'],['createdAt','Issued']] },
  payments: { title: 'Payments', description: 'Verified payment records tied to invoices and customer accounts.', fields: [], columns: [['customer','Customer'],['invoice','Invoice'],['amount','Amount'],['method','Method'],['reference','Transaction reference'],['paidAt','Paid at']] },
};

const initial = (resource) => resource === 'products' ? { currency: 'INR', active: true, salesPrice: '' } : resource === 'plans' ? { currency: 'INR', active: true, allowRenewal: true, allowPause: false, billingUnit: 'MONTH', intervalCount: 1, price: '', productIds: [] } : {};
const money = (value, currency = 'INR') => new Intl.NumberFormat('en-IN', { style: 'currency', currency: currency || 'INR', maximumFractionDigits: 2 }).format(Number(value || 0));
const date = (value) => value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export default function AdminResourcePage({ resource }) {
  const config = definitions[resource];
  const { token } = useAuth();
  const [items, setItems] = useState([]); const [products, setProducts] = useState([]); const [pagination, setPagination] = useState({ page: 1, pageCount: 1, total: 0 });
  const [page, setPage] = useState(1); const [searchText, setSearchText] = useState(''); const [search, setSearch] = useState(''); const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [downloading, setDownloading] = useState(''); const [error, setError] = useState(''); const [message, setMessage] = useState(''); const [editor, setEditor] = useState(null); const [form, setForm] = useState(initial(resource));
  const isEditable = config.canEdit;
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const result = await listAdmin(resource, token, { page, pageSize: 15, search, status });
      setItems(result.data); setPagination(result.pagination || { page: 1, pageCount: 1, total: result.data.length });
    } catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }, [resource, token, page, search, status]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (resource !== 'plans' || !isEditable) return; listAdmin('products', token, { pageSize: 100, status: 'active' }).then((result) => setProducts(result.data)).catch(() => setProducts([])); }, [resource, isEditable, token]);

  const columns = useMemo(() => config.columns, [config]);
  const openNew = () => { setForm(initial(resource)); setEditor({ id: null }); setError(''); setMessage(''); };
  const openEdit = (item) => {
    const next = { ...item };
    if (resource === 'plans') { next.productIds = item.products?.map((entry) => entry.productId) || []; }
    setForm(next); setEditor({ id: item.id }); setError(''); setMessage('');
  };
  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setError(''); setMessage('');
    const input = { ...form };
    for (const [key, , type] of config.fields) {
      if (type === 'number' && input[key] !== '' && input[key] != null) input[key] = Number(input[key]);
      if (type === 'checkbox') input[key] = Boolean(input[key]);
    }
    for (const key of ['companyName','billingEmail','phone','taxNumber','description','type']) if (input[key] === '') input[key] = null;
    if (resource === 'plans' && !input.productIds?.length) { setError('Select at least one active product for this plan.'); setSaving(false); return; }
    try {
      if (editor.id) await updateAdmin(resource, editor.id, input, token);
      else await createAdmin(resource, input, token);
      setEditor(null); setMessage(editor.id ? 'Record updated.' : 'Record created.'); await load();
    } catch (requestError) { setError(requestError.message); }
    finally { setSaving(false); }
  };
  const saveInvoice = async (item) => { setDownloading(item.id); setError(''); try { await downloadInvoice(item.id, item.number, token); } catch (e) { setError(e.message); } finally { setDownloading(''); } };

  return <AdminOnly><PageHeader eyebrow="BUSINESS MANAGEMENT" title={config.title} description={config.description} action={isEditable ? <button className="button button-primary" onClick={openNew}>Add {resource === 'plans' ? 'plan' : resource === 'products' ? 'product' : 'customer'} <Icon name="arrow" size={15}/></button> : undefined}/>
    {message && <div className="notice notice-info" role="status">{message}</div>}
    <div className="resource-toolbar"><form className="search-form" onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(searchText.trim()); }}><label className="sr-only" htmlFor="record-search">Search {config.title.toLowerCase()}</label><input id="record-search" value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder={`Search ${config.title.toLowerCase()}…`}/><button className="button button-outline button-small">Search</button></form>{config.fields.find(([key]) => key === 'status') && <label className="filter-select"><span className="sr-only">Filter status</span><select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">All statuses</option>{config.fields.find(([key]) => key === 'status')?.[4].filter(Boolean).map((value) => <option key={value} value={value}>{value.replaceAll('_',' ')}</option>)}</select></label>}<span className="result-count">{pagination.total} records</span></div>
    {error && !editor && <ErrorState error={error} onRetry={load}/>} {loading ? <Loading label={`Loading ${config.title.toLowerCase()}…`}/> : items.length ? <section className="panel"><div className="table-scroll"><table><thead><tr>{columns.map(([,label]) => <th key={label}>{label}</th>)}<th><span className="sr-only">Actions</span></th></tr></thead><tbody>{items.map((item) => <tr key={item.id}>{columns.map(([key]) => <td key={key}>{renderCell(resource,key,item)}</td>)}<td className="row-actions">{resource === 'invoices' && <button className="icon-button" aria-label={`Download ${item.number}`} onClick={() => saveInvoice(item)} disabled={Boolean(downloading)}>{downloading === item.id ? <span className="spinner spinner-small"/> : <Icon name="receipt" size={16}/>}</button>}{isEditable && <button className="button button-outline button-small" onClick={() => openEdit(item)}>Edit</button>}</td></tr>)}</tbody></table></div><div className="pagination"><span>Page {pagination.page} of {Math.max(1,pagination.pageCount)}</span><div><button className="button button-outline button-small" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button><button className="button button-outline button-small" disabled={page >= pagination.pageCount} onClick={() => setPage((value) => value + 1)}>Next</button></div></div></section> : !error && <EmptyState title={`No ${config.title.toLowerCase()} found`} detail={search ? 'Try a different search.' : `Records will appear here when they are added to Brightloop.`} action={isEditable && <button className="button button-primary button-small" onClick={openNew}>Add your first record</button>}/>}
    {editor && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditor(null); }}><section className="editor-modal" role="dialog" aria-modal="true" aria-labelledby="editor-heading"><div className="editor-header"><div><span className="section-kicker">{editor.id ? 'UPDATE RECORD' : 'NEW RECORD'}</span><h2 id="editor-heading">{editor.id ? 'Edit' : 'Add'} {resource === 'plans' ? 'plan' : resource === 'products' ? 'product' : 'customer'}</h2></div><button className="icon-button" aria-label="Close" onClick={() => setEditor(null)}><Icon name="close"/></button></div>{error && <ErrorState error={error}/>}<form className="editor-form" onSubmit={submit}>
      {config.fields.filter(([key]) => key !== 'status').map(([key,label,type,required,options]) => <label className={`form-field${type === 'checkbox' ? ' checkbox-field' : ''}`} key={key}>{type === 'checkbox' ? <><input type="checkbox" checked={Boolean(form[key])} onChange={(e) => setForm((f) => ({ ...f,[key]:e.target.checked }))}/><span>{label}</span></> : <><span>{label}{required && ' *'}</span>{type === 'select' ? <select value={form[key] ?? ''} onChange={(e) => setForm((f) => ({ ...f,[key]:e.target.value }))} required={required}>{options.map((value) => <option key={value} value={value}>{value}</option>)}</select> : <input type={type} value={form[key] ?? ''} onChange={(e) => setForm((f) => ({ ...f,[key]:e.target.value }))} required={required} min={type === 'number' ? '0' : undefined} maxLength={type !== 'number' ? 1000 : undefined} placeholder={label}/>}</>}</label>)}
      {resource === 'plans' && <label className="form-field"><span>Included products *</span><select multiple value={form.productIds || []} onChange={(e) => setForm((f) => ({ ...f,productIds:Array.from(e.target.selectedOptions, (option) => option.value) }))}>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select><small>{products.length ? 'Use Ctrl or Command to select more than one.' : 'No active products yet. Create an active product first.'}</small></label>}
      <div className="editor-actions"><button type="button" className="button button-outline" onClick={() => setEditor(null)}>Cancel</button><button className="button button-primary" disabled={saving}>{saving ? 'Saving…' : editor.id ? 'Save changes' : 'Create record'}</button></div>
    </form></section></div>}
  </AdminOnly>;
}

function renderCell(resource,key,item) {
  if (key === 'status') return <StatusBadge status={item.status ?? (item.active ? 'active' : 'inactive')}/>;
  if (key === 'active') return <StatusBadge status={item.active ? 'active' : 'inactive'}/>;
  if (['createdAt','paidAt','startDate','nextBillingDate'].includes(key)) return date(item[key]);
  if (['salesPrice','price','grandTotal','total','balanceDue','amount'].includes(key)) return money(item[key],item.currency || item.invoice?.currency);
  if (key === 'billingUnit') return item.intervalCount ? `${item.intervalCount} ${String(item.billingUnit).toLowerCase()}${item.intervalCount > 1 ? 's' : ''}` : item.billingUnit;
  if (key === 'products') return item.products?.map((entry) => entry.product.name).join(', ') || '—';
  if (key === 'customer') return item.customer?.companyName || item.customer?.name || '—';
  if (key === 'plan') return item.plan?.name || item.subscription?.plan?.name || '—';
  if (key === 'invoice') return item.invoice?.number || item.number || '—';
  if (key === 'method') return String(item.method || '').replaceAll('_',' ');
  return item[key] || '—';
}
