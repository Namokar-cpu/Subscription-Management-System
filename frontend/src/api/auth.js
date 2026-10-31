import { request } from './client.js';

export const loginRequest = (input) => request('/auth/login', { method: 'POST', body: JSON.stringify(input) });
export const registerRequest = (input) => request('/auth/register', { method: 'POST', body: JSON.stringify(input) });
export const currentUserRequest = (token) => request('/auth/me', { token });
export const resendVerificationRequest = (email) => request('/auth/resend-verification', { method: 'POST', body: JSON.stringify({ email }) });
