import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createProductInvoice, getOrder, getProducts, verifyPayment } from '../api/billing.js';
import CustomerOnly from '../components/CustomerOnly.jsx';
import Icon from '../components/Icon.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { EmptyState, ErrorState, Loading } from '../components/States.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { openRazorpayCheckout } from '../utils/razorpayCheckout.js';

const money = (value, currency) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: currency || 'INR', maximumFractionDigits: 2 }).format(Number(value || 0));

export default function ProductsPage() {
  const { token, user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const load = useCallback(async () => {
    if (user?.role !== 'CUSTOMER') { setLoading(false); return; }
    setLoading(true); setError('');
    try { setProducts((await getProducts(token)).data); }
    catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }, [token, user?.role]);
  useEffect(() => { load(); }, [load]);

  const buyProduct = async (product) => {
    setPaying(product.id); setError(''); setNotice('');
    try {
      const invoiceResult = await createProductInvoice(product.id, token);
      const invoice = invoiceResult.data;
      const order = (await getOrder(invoice.id, token)).data;
      setPaying('');
      await openRazorpayCheckout({
        order,
        description: `${product.name} · one-time purchase`,
        onSuccess: async (payment) => {
          setPaying(product.id); setNotice('Verifying your payment securely…');
          try {
            await verifyPayment({ invoiceId: invoice.id, ...payment }, token);
            setNotice(`Payment verified. ${product.name} is paid for. Invoice ${invoice.number} is available in Invoices.`);
          } catch (verifyError) { setError(verifyError.message); setNotice(''); }
          finally { setPaying(''); }
        },
        onFailure: (payment) => { setPaying(''); setError(payment.error?.description || 'Payment was not completed. You can retry this product.'); },
        onDismiss: () => { setPaying(''); setNotice('Checkout closed. No payment was recorded. You can try again when ready.'); },
      });
    } catch (requestError) { setError(requestError.message); setPaying(''); }
  };

  return <CustomerOnly>
    <PageHeader eyebrow="PRODUCT CATALOG" title="Choose a product." description="Buy a product once, or find a recurring plan that includes it." action={<Link className="button button-outline" to="/app/plans">View subscription plans <Icon name="arrow" size={15}/></Link>}/>
    {notice && <div className="notice notice-info" role="status">{notice}{notice.includes('Invoice') && <Link className="inline-link" to="/app/invoices">View invoices <Icon name="arrow" size={14}/></Link>}</div>}
    {error && <ErrorState error={error} onRetry={load}/>}
    {loading ? <Loading label="Loading products…"/> : products.length ? <div className="catalog-products-grid">{products.map((product) => <article className="panel catalog-product-card" key={product.id}>
      <div className="product-card-icon"><Icon name="box" size={19}/></div>
      <span className="section-kicker">{product.type || 'PRODUCT'}</span>
      <h2>{product.name}</h2>
      <p>{product.description || 'Available for one-time purchase from Brightloop.'}</p>
      <div className="product-card-price">{money(product.salesPrice, product.currency)} <small>one time</small></div>
      <button className="button button-primary product-buy-button" onClick={() => buyProduct(product)} disabled={Boolean(paying)}>{paying === product.id ? 'Preparing secure checkout…' : 'Buy once with Razorpay'} <Icon name="arrow" size={15}/></button>
      <small className="product-payment-note"><Icon name="lock" size={13}/> UPI, cards, or other methods shown by Razorpay</small>
    </article>)}</div> : !error && <EmptyState title="No products are available" detail="There are no active products in the catalog right now. Please check back later." action={<Link className="button button-outline button-small" to="/app/plans">Browse plans</Link>}/>}
    {!loading && products.length > 0 && <p className="catalog-plan-hint">Looking for recurring billing? <Link to="/app/plans">Browse subscription plans <Icon name="arrow" size={14}/></Link></p>}
  </CustomerOnly>;
}
