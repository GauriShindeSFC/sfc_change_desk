// Bearer-token auth guard. Resolves token subject via IdentityResolver and attaches normalized req.user.
import { verifyToken, publicUser } from '../services/authService.js';
import { IdentityResolver } from '../services/IdentityResolver.js';

export const requireAuth = async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired session' });
  }

  try {
    const userKey = payload.sub;
    const result = await IdentityResolver.resolveByKey(userKey);

    if (result.status !== 'SUCCESS' || !result.identity) {
      return res.status(401).json({
        success: false,
        message: result.message || 'Session is no longer valid or user access revoked'
      });
    }

    req.user = publicUser(result.identity);
    next();
  } catch (dbErr) {
    console.error('[requireAuth] Database connection error:', dbErr.message);
    return res.status(503).json({ success: false, message: 'Database connection busy. Please retry.' });
  }
};
