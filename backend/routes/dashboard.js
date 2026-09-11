import express from 'express';
import {
  getMetrics,
  getCategories,
  getStatusBreakdown,
  exportDashboardData
} from '../controllers/dashboardController.js';
import { authenticateUser, requireOrganizationScopeRole } from '../middlewares/authMiddleware.js';

import changeRequestsRouter from './changeRequests.js';
import worklistRouter from './worklist.js';
import settingsRouter from './settings.js';
import catalogueRouter from './catalogue.js';

const router = express.Router();

// Apply authentication middleware globally
router.use(authenticateUser);

// Core Dashboard analytics & export
router.get('/metrics', requireOrganizationScopeRole, getMetrics);
router.get('/categories', requireOrganizationScopeRole, getCategories);
router.get('/status-breakdown', requireOrganizationScopeRole, getStatusBreakdown);
router.get('/export', requireOrganizationScopeRole, exportDashboardData);

// Modular Domain Routers
router.use('/', changeRequestsRouter);
router.use('/', worklistRouter);
router.use('/', settingsRouter);
router.use('/', catalogueRouter);

export default router;
