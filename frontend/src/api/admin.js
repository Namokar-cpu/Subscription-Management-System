import { request } from './client.js';

export const getAdminDashboard = (token) => request('/admin/dashboard', { token });
export const listAdmin = (resource, token, params = {}) => {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== '' && value != null));
  return request(`/admin/${resource}${query.size ? `?${query}` : ''}`, { token });
};
export const createAdmin = (resource, input, token) => request(`/admin/${resource}`, { method: 'POST', token, body: JSON.stringify(input) });
export const updateAdmin = (resource, id, input, token) => request(`/admin/${resource}/${encodeURIComponent(id)}`, { method: 'PATCH', token, body: JSON.stringify(input) });
export const getIntegrations = (token) => request('/admin/integrations', { token });
