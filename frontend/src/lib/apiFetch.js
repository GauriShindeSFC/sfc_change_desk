// fetch() wrapper for the dashboard API: prepends the base URL, attaches
// the bearer token, and signs the user out on a 401.
import { API_BASE_URL } from './config';
import { getToken, clearSession } from './auth';

export const apiFetch = async (path, options = {}) => {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });

  if (res.status === 401) {
    clearSession();
    window.location.reload(); // App will render the login page
  }

  return res;
};
