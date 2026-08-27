import express from 'express';
import {
  getMetrics,
  getCategories,
  getStatusBreakdown,
  getRecentRequests,
  getMyRequests,
  createChangeRequest,
  getWorklist,
  handleWorklistAction,
  getCatalog,
  getCatalogueManagement,
  createCatalogItem,
  getSettingsUsers,
  createSettingsUser,
  getSettingsRoles,
  getSettingsAuditLogs,
  getReportsMetrics,
  exportReport
} from '../controllers/dashboardController.js';
import { validateChangeRequest } from '../validations/changeRequestValidation.js';

const router = express.Router();

// Dashboard analytics
router.get('/metrics', getMetrics);
router.get('/categories', getCategories);
router.get('/status-breakdown', getStatusBreakdown);
router.get('/change-requests/recent', getRecentRequests);

// Change requests
router.get('/my-requests', getMyRequests);
router.post('/change-requests', validateChangeRequest, createChangeRequest);

// Change catalog (browse)
router.get('/catalog', getCatalog);

// CAB worklist / approvals
router.get('/worklist', getWorklist);
router.post('/worklist/action', handleWorklistAction);

// Settings & governance
router.get('/settings/users', getSettingsUsers);
router.post('/settings/users', createSettingsUser);
router.get('/settings/roles', getSettingsRoles);
router.get('/settings/audit-logs', getSettingsAuditLogs);

// Catalogue & workflow management
router.get('/catalogue-management', getCatalogueManagement);
router.post('/catalogue-management/item', createCatalogItem);

// Reports
router.get('/reports/metrics', getReportsMetrics);
router.post('/reports/export', exportReport);

export default router;
