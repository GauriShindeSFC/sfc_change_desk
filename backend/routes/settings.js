import express from 'express';
import {
  getSettingsUsers,
  createSettingsUser,
  updateSettingsUser,
  getSettingsRoles,
  updateRolePermissions,
  getSettingsAuditLogs,
  exportAuditLogs,
  getChangeManagerCategories,
  updateChangeManagerCategories
} from '../controllers/dashboardController.js';
import { requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/settings/users', requireRole(['Super Admin', 'role-1']), getSettingsUsers);
router.post('/settings/users', requireRole(['Super Admin', 'role-1']), createSettingsUser);
router.patch('/settings/users/:id', requireRole(['Super Admin', 'role-1']), updateSettingsUser);
router.get('/settings/roles', requireRole(['Super Admin', 'role-1']), getSettingsRoles);
router.patch('/settings/roles/:id', requireRole(['Super Admin', 'role-1']), updateRolePermissions);
router.get('/settings/audit-logs', requireRole(['Super Admin', 'role-1']), getSettingsAuditLogs);
router.post('/settings/audit-logs/export', requireRole(['Super Admin', 'role-1']), exportAuditLogs);

router.get('/settings/change-manager-categories/:userId', requireRole(['Super Admin', 'role-1']), getChangeManagerCategories);
router.put('/settings/change-manager-categories/:userId', requireRole(['Super Admin', 'role-1']), updateChangeManagerCategories);

export default router;
