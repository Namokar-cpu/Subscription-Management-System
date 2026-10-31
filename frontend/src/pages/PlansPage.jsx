import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createInvoice, getOrder, getPlans, startSubscription, verifyPayment } from '../api/billing.js';
import { openRazorpayCheckout } from '../utils/razorpayCheckout.js';
import CustomerOnly from '../components/CustomerOnly.jsx';
import Icon from '../components/Icon.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { EmptyState, ErrorState, Loading } from '../components/States.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const money = (value, currency) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: currency || 'INR', maximumFractionDigits: 2 }).format(Number(value || 0));

export default function PlansPage() {
  const { token, user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyPlan, setBusyPlan] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pendingByPlan, setPendingByPlan] = useState({});
  const load = useCallback(async () => {
    if (user?.role !== 'CUSTOMER') { setLoading(false); return; }
    setLoading(true); setError('');
    try { const result = await getPlans(token); setPlans(result.data); }
    catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }, [token, user?.role]);
  useEffect(() => { load(); }, [load]);

  const beginCheckout = async (plan) => {
    setBusyPlan(plan.id); setError(''); setNotice('');
    try {
      let subscriptionId = pendingByPlan[plan.id];
      if (!subscriptionId) {
        const created = await startSubscription(plan.id, token);
        subscriptionId = created.data.id;
        setPendingByPlan((current) => ({ ...current, [plan.id]: subscriptionId }));
      }
      const invoiceResult = await createInvoice(subscriptionId, token);
      const invoiceId = invoiceResult.data.id;
      const orderResult = await getOrder(invoiceId, token);
      const order = orderResult.data;
      setBusyPlan('');
      await openRazorpayCheckout({
        order,
        description: `${plan.name} · Invoice ${order.invoiceNumber}`,
        onSuccess: async (payment) => {
          setBusyPlan(plan.id); setNotice('Verifying your payment securely…');
          try {
            const verified = await verifyPayment({ invoiceId, ...payment }, token);
            setNotice(verified.data.subscriptionActivated ? 'Payment verified. Your subscription is active.' : 'Payment verified and recorded.');
            setPendingByPlan((current) => { const next = { ...current }; delete next[plan.id]; return next; });
          } catch (verifyError) { setError(verifyError.message); setNotice(''); }
          finally { setBusyPlan(''); }
        },
        onFailure: (payment) => {
          setBusyPlan('');
          setError(payment.error?.description || 'Payment was not completed. You can retry checkout when ready.');
        },
        onDismiss: () => { setBusyPlan(''); setNotice('Checkout closed. Your subscription remains pending until payment is verified.'); },
      });
    } catch (requestError) { setError(requestError.message); setBusyPlan(''); }
  };

  return <CustomerOnly><PageHeader eyebrow="PRODUCTS & PLANS" title="Choose what works for you." description="Available plans come directly from your Brightloop account catalog." action={<Link className="button button-outline" to="/app">Back to overview</Link>} />
    {error && <ErrorState error={error} onRetry={load}/>} {notice && <div className="notice notice-info" role="status"><span>{notice}</span>{notice.includes('active') && <Link className="inline-link" to="/app/subscriptions">View subscription <Icon name="arrow" size={15}/></Link>}</div>}
    {loading ? <Loading label="Loading available plans…"/> : plans.length ? <div className="plans-grid">{plans.map((plan, index) => <article className={`plan-card${index === 1 ? ' plan-featured' : ''}`} key={plan.id}>{index === 1 && <span className="plan-featured-tag">GOOD TO KNOW</span>}<div className="plan-card-top"><span className="plan-icon"><Icon name="spark"/></span><span className="section-kicker">{plan.billingUnit} PLAN</span></div><h2>{plan.name}</h2><p className="plan-description">{plan.description || 'A Brightloop subscription plan.'}</p><div className="plan-price">{money(plan.price, plan.currency)}<span> / {plan.intervalCount} {plan.billingUnit.toLowerCase()}{plan.intervalCount > 1 ? 's' : ''}</span></div><div className="plan-divider"/><div className="plan-includes"><strong>Included</strong>{plan.products.map(({ product, quantity }) => <div key={product.id}><span className="include-check"><Icon name="check" size={13}/></span><span>{product.name}</span>{quantity > 1 && <small>×{quantity}</small>}</div>)}</div><button className={`button ${index === 1 ? 'button-primary' : 'button-outline'} plan-cta`} onClick={() => beginCheckout(plan)} disabled={Boolean(busyPlan)}>{busyPlan === plan.id ? 'Preparing checkout…' : 'Choose this plan'} <Icon name="arrow" size={16}/></button><small className="plan-note">Secure checkout by Razorpay · INR</small></article>)}</div> : !error && <EmptyState title="No plans are available" detail="There are no active plans in the catalog right now. Please check back later."/>}
  </CustomerOnly>;
}
