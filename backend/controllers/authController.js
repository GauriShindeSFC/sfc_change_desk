import { asyncHandler } from '../utils/asyncHandler.js';
import { authenticate, issueToken, publicUser } from '../services/authService.js';

// POST /api/auth/login  { email, password } -> { token, user }
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  const user = await authenticate(email, password);
  res.json({ success: true, token: issueToken(user), user: publicUser(user) });
});

// GET /api/auth/me  (requireAuth) -> { user }
export const me = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user });
});
