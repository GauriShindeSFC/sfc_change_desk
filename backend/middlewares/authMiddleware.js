import jwt from 'jsonwebtoken';
import { User, Role } from '../models/index.js';

const SECRET = process.env.JWT_SECRET || 'dev-change-desk-secret';

export const authenticateUser = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const headerUserId = req.headers['x-user-id'];

  if (token) {
    try {
      const payload = jwt.verify(token, SECRET);
      const userId = payload.sub || payload.id;
      const user = await User.findByPk(userId, {
        include: [{ model: Role, as: 'role', attributes: ['id', 'name'] }]
      });

      if (user && user.status === 'Active') {
        req.user = {
          id: user.id,
          name: user.name,
          role: user.role?.name || 'Requester',
          roleId: user.roleId,
          employeeId: user.employeeId || 'EMP-10432'
        };
        return next();
      }
    } catch (err) {
      // Invalid/expired JWT token - proceed to fallback below
    }
  }

  // Fallback to x-user-id header or default user
  const targetId = headerUserId || 'usr-1';
  try {
    const user = await User.findByPk(targetId, {
      include: [{ model: Role, as: 'role', attributes: ['id', 'name'] }]
    });
    req.user = {
      id: user?.id || targetId,
      name: user?.name || 'Gauri Shinde',
      role: user?.role?.name || 'Change Manager',
      roleId: user?.roleId || 'role-2',
      employeeId: user?.employeeId || 'EMP-10432'
    };
    next();
  } catch (err) {
    req.user = {
      id: 'usr-1',
      name: 'Gauri Shinde',
      role: 'Change Manager',
      roleId: 'role-2',
      employeeId: 'EMP-10432'
    };
    next();
  }
};

export const requireRole = (allowedRoles = []) => {
  const rolesList = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req, res, next) => {
    const userRole = req.user?.role || 'Change Manager';
    const userRoleId = req.user?.roleId || '';

    // Admin has superuser access to all routes
    if (userRole === 'Admin' || userRoleId === 'role-1' || rolesList.includes(userRole) || rolesList.includes(userRoleId)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Access denied. Role "${userRole}" lacks permissions for this action. Required: [${rolesList.join(', ')}]`
    });
  };
};
