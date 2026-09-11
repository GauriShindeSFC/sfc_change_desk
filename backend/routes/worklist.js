import express from 'express';
import {
  getWorklist,
  handleWorklistAction,
  addChangeRequestComment
} from '../controllers/dashboardController.js';
import { requireRole, requireOrganizationScopeRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/worklist', requireRole(['Change Manager', 'Change Implementer', 'Admin', 'Super Admin', 'role-5']), requireOrganizationScopeRole, getWorklist);
router.get('/my-worklist', requireRole(['Change Manager', 'Change Implementer', 'Admin', 'Super Admin', 'role-5']), requireOrganizationScopeRole, getWorklist);
router.post('/worklist/action', requireRole(['Change Manager', 'Change Implementer', 'Admin', 'Super Admin', 'role-5']), handleWorklistAction);
router.post('/worklist/comment', requireRole(['Change Manager', 'Change Implementer', 'Admin', 'Super Admin', 'role-5']), addChangeRequestComment);

export default router;
