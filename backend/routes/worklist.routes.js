import express from 'express';
import {
  getWorklist,
  getWorklistCounts,
  handleWorklistAction,
  addChangeRequestComment
} from '../controllers/worklist.controller.js';
import { requireRole, requireOrganizationScopeRole } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { worklistActionSchema } from '../validations/worklist.validation.js';

const router = express.Router();

// Any authenticated user can call this — the underlying counts are already
// role-gated per domain and simply come back 0 for a domain the caller can't
// act on, so there's nothing to additionally restrict at the route level.
router.get('/worklist/counts', getWorklistCounts);

router.get('/worklist', requireRole(['Change Manager', 'Change Implementer', 'Admin', 'Super Admin', 'Change Desk Admin', 'role-1', 'role-2', 'role-2-change', 'role-3', 'role-5']), requireOrganizationScopeRole, getWorklist);
router.get('/my-worklist', requireRole(['Change Manager', 'Change Implementer', 'Admin', 'Super Admin', 'Change Desk Admin', 'role-1', 'role-2', 'role-2-change', 'role-3', 'role-5']), requireOrganizationScopeRole, getWorklist);
router.post('/worklist/action', requireRole(['Change Manager', 'Change Implementer', 'Admin', 'Super Admin', 'Change Desk Admin', 'role-1', 'role-2', 'role-2-change', 'role-3', 'role-5']), validate(worklistActionSchema), handleWorklistAction);
router.post('/worklist/comment', requireRole(['Change Manager', 'Change Implementer', 'Admin', 'Super Admin', 'Change Desk Admin', 'role-1', 'role-2', 'role-2-change', 'role-3', 'role-5']), addChangeRequestComment);

export default router;
