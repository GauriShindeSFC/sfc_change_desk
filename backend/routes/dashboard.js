import express from 'express';
import {
  getMetrics,
  getCategories,
  getStatusBreakdown,
  getRecentRequests
} from '../controllers/dashboardController.js';
import { authenticateUser } from '../middlewares/authMiddleware.js';

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
router.get('/metrics', getMetrics);
router.get('/categories', getCategories);
router.get('/status-breakdown', getStatusBreakdown);
router.get('/change-requests/recent', getRecentRequests);

// Modular Domain Routers
router.use('/', changeRequestsRouter);
router.use('/', worklistRouter);
router.use('/', reportsRouter);
router.use('/', settingsRouter);
router.use('/', catalogueRouter);
router.use('/', notificationsRouter);

export default router;
