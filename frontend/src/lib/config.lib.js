// Centralized frontend runtime configuration.
// Reads Vite env vars (must be prefixed with VITE_) with safe fallbacks
// so the app still runs if `.env` is missing.

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api/dashboard';

// API root without the trailing "/dashboard" segment -> ".../api"
export const API_ROOT = API_BASE_URL.replace(/\/[^/]+\/?$/, '');

// Auth endpoints live at ".../api/auth"
export const AUTH_BASE_URL = `${API_ROOT}/auth`;
