import { asyncHandler } from '../utils/asyncHandler.js';
import {
  authenticate,
  issueToken,
  publicUserAsync,
  getMicrosoftAuthUrl,
  handleMicrosoftCallbackService
} from '../services/auth.service.js';

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
  const authUrl = getMicrosoftAuthUrl();
  res.redirect(authUrl);
});

// GET /api/auth/microsoft/callback?code=... -> Redirects back to Frontend with JWT session
export const handleMicrosoftCallback = asyncHandler(async (req, res) => {
  const { code, error, error_description } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';

  if (error) {
    const errorMsg = encodeURIComponent(error_description || error || 'Microsoft sign in was cancelled or failed.');
    return res.redirect(`${frontendUrl}/login?error=${errorMsg}`);
  }

  try {
    const { token } = await handleMicrosoftCallbackService(code);
    return res.redirect(`${frontendUrl}/login?token=${token}`);
  } catch (err) {
    const errorMsg = encodeURIComponent(err.message || 'Authentication failed');
    return res.redirect(`${frontendUrl}/login?error=${errorMsg}`);
  }
});

