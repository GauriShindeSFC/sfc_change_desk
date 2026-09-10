import jwt from 'jsonwebtoken';
import { verifyToken, publicUser } from '../services/authService.js';
import { IdentityResolver } from '../services/IdentityResolver.js';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required and not set.');
}
const SECRET = process.env.JWT_SECRET;

export const authenticateUser = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (token) {
    try {
      const payload = verifyToken(token);
      const userKey = payload.sub;
      const result = await IdentityResolver.resolveByKey(userKey);

      if (result.status === 'SUCCESS' && result.identity) {
        req.user = publicUser(result.identity);
        return next();
      }
    } catch (err) {
      // Token verification failed
    }
  }

  // Without a valid JWT, access is denied
  return res.status(401).json({
    success: false,
    message: 'Authentication required. Please log in.'
  });
};

export const requireRole = (allowedRoles = []) => {
  const rolesList = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req, res, next) => {
    const userRole = req.user?.role || '';
    const userRoleId = req.user?.roleId || '';
    const appRole = req.user?.applicationRole || '';

    // Super Admin (role-1 / SUPER_ADMIN) has superuser access across ALL endpoints
    if (
      userRole === 'Super Admin' ||
      userRoleId === 'role-1' ||
      appRole === 'SUPER_ADMIN' ||
      rolesList.includes(userRole) ||
      rolesList.includes(userRoleId) ||
      rolesList.includes(appRole)
    ) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Access denied. Role "${userRole}" lacks permissions for this action. Required: [${rolesList.join(', ')}]`
    });
  };
};

export const requireOrganizationScopeRole = (req, res, next) => {
  const scope = String(req.query.scope || '').toLowerCase();
  if (scope !== 'organization' && scope !== 'org') return next();
  return requireRole(['Admin', 'Super Admin'])(req, res, next);
};
