import express from 'express';
import {
  getMetrics,
  getCategories,
  getStatusBreakdown,
  getRecentRequests,
  getMyRequests,
  getWorklist,
  handleWorklistAction,
  getSettingsUsers,
  getSettingsRoles,
  getSettingsAuditLogs,
  getCatalogueManagement,
  createCatalogItem,
  getReportsMetrics,
  exportReport,
  createChangeRequest
} from '../controllers/dashboardController.js';
import { validateChangeRequest } from '../validations/changeRequestValidation.js';

const router = express.Router();

// Dashboard Analytics Routes
router.get('/metrics', getMetrics);
router.get('/categories', getCategories);
router.get('/status-breakdown', getStatusBreakdown);
router.get('/change-requests/recent', getRecentRequests);

// Change Requests Routes
router.get('/my-requests', getMyRequests);
router.post('/change-requests', validateChangeRequest, createChangeRequest);

// Catalog Routes
router.get('/catalog', getCatalogueManagement);

// Worklist Approval Routes
router.get('/worklist', getWorklist);
router.post('/worklist/action', handleWorklistAction);

// Settings Routes
router.get('/settings/users', getSettingsUsers);
router.get('/settings/roles', getSettingsRoles);
router.get('/settings/audit-logs', getSettingsAuditLogs);

// Catalogue Management Routes
router.get('/catalogue-management', getCatalogueManagement);
router.post('/catalogue-management/item', createCatalogItem);

// Reports Routes
router.get('/reports/metrics', getReportsMetrics);
router.post('/reports/export', exportReport);

export default router;
