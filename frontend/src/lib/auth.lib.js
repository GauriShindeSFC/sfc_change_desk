// Session handling for the email/password login.
// The whole session ({ token, user }) is kept in localStorage so a
// refresh stays signed in. Swapping in Microsoft SSO later only
// changes how `login()` obtains the token.
import { AUTH_BASE_URL } from './config.lib';

const KEY = 'changedesk.session';

export const getSession = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || null;
  } catch {
    return null;
  }
};

export const saveSession = (session) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    /* storage unavailable — stay in-memory for this tab */
  }
};

export const clearSession = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
};

export const getToken = () => getSession()?.token || null;

export const login = async (email, password) => {
  const res = await fetch(`${AUTH_BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success) {
    throw new Error(body.message || `Sign in failed (${res.status})`);
  }
  return { token: body.token, user: body.user };
};

export const MICROSOFT_LOGIN_URL = `${AUTH_BASE_URL}/microsoft`;

// Exchanges the single-use code from the SSO redirect for the real session token.
// The redirect never carries the JWT itself, only this short-lived opaque code.
export const exchangeSsoCode = async (code) => {
  const res = await fetch(`${AUTH_BASE_URL}/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code })
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success) {
    throw new Error(body.message || 'Sign-in link is invalid or has expired.');
  }
  return body.token;
};

// Re-validate the token and refresh the user record on app load.
export const fetchMe = async (overrideToken = null) => {
  const token = overrideToken || getToken();
  if (!token) return null;
  try {
    const res = await fetch(`${AUTH_BASE_URL}/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return null;
    const body = await res.json().catch(() => ({}));
    return body.user || null;
  } catch {
    return null;
  }
};
