let scriptPromise;

export function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(true);
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => { scriptPromise = null; resolve(false); };
    document.body.appendChild(script);
  });
  return scriptPromise;
}

export async function openRazorpayCheckout({ order, description, onSuccess, onFailure, onDismiss }) {
  if (!(await loadRazorpay())) throw new Error('Razorpay Checkout could not be loaded. Check your network and try again.');
  const checkout = new window.Razorpay({
    key: order.keyId,
    amount: order.amount,
    currency: order.currency,
    name: 'Brightloop',
    description,
    order_id: order.orderId,
    theme: { color: '#f5b942' },
    handler: onSuccess,
    modal: { ondismiss: onDismiss },
  });
  if (onFailure) checkout.on('payment.failed', onFailure);
  checkout.open();
  return checkout;
}
