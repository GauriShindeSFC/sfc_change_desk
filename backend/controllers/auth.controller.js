import crypto from 'node:crypto';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  authenticate,
  issueToken,
  publicUserAsync,
  getMicrosoftAuthUrl,
  handleMicrosoftCallbackService,
  createSsoExchangeCode,
  consumeSsoExchangeCode
} from '../services/auth.service.js';

const OAUTH_STATE_COOKIE = 'oauth_state';
const isProd = process.env.NODE_ENV === 'production';

const parseCookies = (cookieHeader = '') =>
  cookieHeader.split(';').reduce((acc, part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return acc;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) acc[key] = decodeURIComponent(value);
    return acc;
  }, {});

const setStateCookie = (res, value, maxAgeSeconds) => {
  res.setHeader(
    'Set-Cookie',
    `${OAUTH_STATE_COOKIE}=${value}; HttpOnly; Path=/api/auth/microsoft; Max-Age=${maxAgeSeconds}; SameSite=Lax${isProd ? '; Secure' : ''}`
  );
};

// POST /api/auth/login  { email } -> { token, user }
export const login = asyncHandler(async (req, res) => {
  const { email } = req.body || {};
  const user = await authenticate(email);
  const userData = await publicUserAsync(user);
  res.json({ success: true, token: issueToken(user), user: userData });
});

// GET /api/auth/me  (requireAuth) -> { user }
export const me = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user });
});

// GET /api/auth/microsoft -> 302 Redirect to Microsoft Login
export const startMicrosoftLogin = asyncHandler(async (req, res) => {
  const state = crypto.randomBytes(24).toString('hex');
  setStateCookie(res, state, 300); // 5 minutes to complete the round trip
  const authUrl = getMicrosoftAuthUrl(state);
  res.redirect(authUrl);
});

// GET /api/auth/microsoft/callback?code=...&state=... -> Redirects back to Frontend with JWT session
export const handleMicrosoftCallback = asyncHandler(async (req, res) => {
  const { code, state, error, error_description } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';

  // Single-use: clear the state cookie regardless of outcome.
  setStateCookie(res, '', 0);

  if (error) {
    const errorMsg = encodeURIComponent(error_description || error || 'Microsoft sign in was cancelled or failed.');
    return res.redirect(`${frontendUrl}/login?error=${errorMsg}`);
  }

  const cookies = parseCookies(req.headers.cookie);
  if (!state || !cookies[OAUTH_STATE_COOKIE] || state !== cookies[OAUTH_STATE_COOKIE]) {
    const errorMsg = encodeURIComponent('Sign-in session expired or is invalid. Please try signing in again.');
    return res.redirect(`${frontendUrl}/login?error=${errorMsg}`);
  }

  try {
    const { token } = await handleMicrosoftCallbackService(code);
    const ssoCode = createSsoExchangeCode(token);
    return res.redirect(`${frontendUrl}/login?ssoCode=${ssoCode}`);
  } catch (err) {
    const errorMsg = encodeURIComponent(err.message || 'Authentication failed');
    return res.redirect(`${frontendUrl}/login?error=${errorMsg}`);
  }
});

// POST /api/auth/exchange  { code } -> { token }  (single-use, ~60s TTL)
export const exchangeSsoCode = asyncHandler(async (req, res) => {
  const { code } = req.body || {};
  const token = code ? consumeSsoExchangeCode(code) : null;

  if (!token) {
    return res.status(400).json({ success: false, message: 'This sign-in link has expired or was already used. Please sign in again.' });
  }

  res.json({ success: true, token });
});

