// Shared API client utility (thin wrapper over apiFetch).
import { apiFetch } from './apiFetch';

export const apiClient = {
  get: async (endpoint) => {
    const res = await apiFetch(endpoint);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return res.json();
  },

  post: async (endpoint, payload) => {
    const res = await apiFetch(endpoint, { method: 'POST', body: JSON.stringify(payload) });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return res.json();
  }
};
