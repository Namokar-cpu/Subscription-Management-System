import { env } from '../../config/env';
import { HttpError } from '../../common/errors';

function credentials() {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw new HttpError(503, 'Razorpay is not configured on this server.');
  }
  return Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString('base64');
}

async function razorpayRequest<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`https://api.razorpay.com/v1${path}`, {
      ...init,
      headers: {
        Authorization: `Basic ${credentials()}`,
        'Content-Type': 'application/json',
        ...init?.headers,
      },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new HttpError(502, 'Could not reach the payment provider. Please retry.');
  }

  const payload = await response.json().catch(() => ({})) as T & { error?: { description?: string } };
  if (!response.ok) {
    console.error('Razorpay API request failed with status', response.status);
    throw new HttpError(502, 'The payment provider rejected the request. Check the server configuration and try again.');
  }
  return payload;
}

export type RazorpayOrder = { id: string; amount: number; currency: string; status: string };
export type RazorpayPayment = { id: string; order_id: string; amount: number; currency: string; status: string };

export function createRazorpayOrder(input: { amount: number; currency: string; receipt: string; invoiceId: string }) {
  return razorpayRequest<RazorpayOrder>('/orders', {
    method: 'POST',
    body: JSON.stringify({
      amount: input.amount,
      currency: input.currency,
      receipt: input.receipt.slice(0, 40),
      notes: { invoiceId: input.invoiceId },
    }),
  });
}

export function fetchRazorpayPayment(paymentId: string) {
  return razorpayRequest<RazorpayPayment>(`/payments/${encodeURIComponent(paymentId)}`);
}

export function getRazorpayKeyId() {
  if (!env.RAZORPAY_KEY_ID) throw new HttpError(503, 'Razorpay is not configured on this server.');
  return env.RAZORPAY_KEY_ID;
}

export function getRazorpaySecret() {
  if (!env.RAZORPAY_KEY_SECRET) throw new HttpError(503, 'Razorpay is not configured on this server.');
  return env.RAZORPAY_KEY_SECRET;
}
