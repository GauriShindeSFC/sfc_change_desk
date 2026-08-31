import express from 'express';
import {
  getSettingsUsers,
  createSettingsUser,
  getSettingsRoles,
  updateRolePermissions,
  getSettingsAuditLogs
} from '../controllers/dashboardController.js';
import { requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/settings/users', getSettingsUsers);
router.post('/settings/users', requireRole(['Admin', 'Change Manager']), createSettingsUser);
router.get('/settings/roles', getSettingsRoles);
router.patch('/settings/roles/:id', requireRole(['Admin', 'Change Manager']), updateRolePermissions);
router.get('/settings/audit-logs', getSettingsAuditLogs);

export default router;
