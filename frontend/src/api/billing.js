import { download, request } from './client.js';

export const getPlans = (token) => request('/catalog/plans', { token });
export const getSubscriptions = (token) => request('/subscriptions', { token });
export const getInvoices = (token) => request('/invoices', { token });
export const getInvoice = (invoiceId, token) => request(`/invoices/${encodeURIComponent(invoiceId)}`, { token });
export const getOrder = (invoiceId, token) => request(`/invoices/${encodeURIComponent(invoiceId)}/order`, { method: 'POST', token });
export const startSubscription = (planId, token) => request('/subscriptions', { method: 'POST', token, body: JSON.stringify({ planId }) });
export const createInvoice = (subscriptionId, token) => request(`/subscriptions/${encodeURIComponent(subscriptionId)}/invoice`, { method: 'POST', token, body: '{}' });
export const verifyPayment = (payload, token) => request('/payments/razorpay/verify', { method: 'POST', token, body: JSON.stringify(payload) });
export const downloadInvoice = (invoiceId, number, token) => download(`/invoices/${encodeURIComponent(invoiceId)}/pdf`, token, `${number}.pdf`);
