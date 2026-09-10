// fetch() wrapper for the dashboard API: prepends the base URL, attaches
// the bearer token, and signs the user out on a 401.
import { API_BASE_URL } from './config';
import { getToken, clearSession } from './auth';

// Several mounted widgets can ask for the same read endpoint at once (and
// React StrictMode intentionally re-runs effects in development). Share one
// network request and give each consumer its own readable Response clone.
const inFlightGets = new Map();

export const apiFetch = async (path, options = {}) => {
  const token = getToken();
  const method = (options.method || 'GET').toUpperCase();
  const url = `${API_BASE_URL}${path}`;
  const hasBody = options.body !== undefined && options.body !== null;
  const requestOptions = {
    ...options,
    headers: {
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  };
  const cacheKey = method === 'GET' && !options.signal ? `${method}:${url}:${token || ''}` : null;
  let responsePromise = cacheKey ? inFlightGets.get(cacheKey) : null;

  if (!responsePromise) {
    responsePromise = fetch(url, requestOptions);
    if (cacheKey) {
      inFlightGets.set(cacheKey, responsePromise);
      responsePromise.finally(() => inFlightGets.delete(cacheKey)).catch(() => {});
    }
  }

  const res = await responsePromise;
  // A Response body may only be consumed once; clones let shared callers use
  // res.json() independently.
  const consumerResponse = cacheKey ? res.clone() : res;

  if (consumerResponse.status === 401) {
    clearSession();
    window.location.reload(); // App will render the login page
  }

  return consumerResponse;
};
