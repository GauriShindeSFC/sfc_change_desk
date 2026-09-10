import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate, issueToken, publicUserAsync } from '../services/authService.js';

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
