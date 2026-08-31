import express from 'express';
import {
  getSettingsUsers,
  createSettingsUser,
  getSettingsRoles,
  updateRolePermissions,
  getSettingsAuditLogs,
  exportAuditLogs
} from '../controllers/dashboardController.js';
import { requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/settings/users', getSettingsUsers);
router.post('/settings/users', requireRole(['Super Admin', 'role-1']), createSettingsUser);
router.get('/settings/roles', getSettingsRoles);
router.patch('/settings/roles/:id', requireRole(['Super Admin', 'role-1']), updateRolePermissions);
router.get('/settings/audit-logs', getSettingsAuditLogs);
router.post('/settings/audit-logs/export', exportAuditLogs);

export default router;
