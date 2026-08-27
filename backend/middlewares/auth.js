// Bearer-token auth guard. Attaches a fresh `req.user` (public shape).
import { verifyToken, findUserById, publicUser } from '../services/authService.js';

export const requireAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const payload = verifyToken(token);
    const user = await findUserById(payload.sub);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Session is no longer valid' });
    }

    req.user = publicUser(user);
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired session' });
  }
};
