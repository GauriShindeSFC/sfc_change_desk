import express from 'express';
import {
  getMetrics,
  getCategories,
  getStatusBreakdown
} from '../controllers/dashboardController.js';
import { authenticateUser, requireOrganizationScopeRole } from '../middlewares/authMiddleware.js';

import changeRequestsRouter from './changeRequests.js';
import worklistRouter from './worklist.js';
import reportsRouter from './reports.js';
import settingsRouter from './settings.js';
import catalogueRouter from './catalogue.js';
import notificationsRouter from './notifications.js';

const router = express.Router();

// Apply authentication middleware globally
router.use(authenticateUser);

// Core Dashboard analytics
router.get('/metrics', requireOrganizationScopeRole, getMetrics);
router.get('/categories', requireOrganizationScopeRole, getCategories);
router.get('/status-breakdown', requireOrganizationScopeRole, getStatusBreakdown);

// Modular Domain Routers
router.use('/', changeRequestsRouter);
router.use('/', worklistRouter);
router.use('/', reportsRouter);
router.use('/', settingsRouter);
router.use('/', catalogueRouter);
router.use('/', notificationsRouter);

export default router;
