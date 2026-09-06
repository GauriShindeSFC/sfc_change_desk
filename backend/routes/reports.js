import express from 'express';
import {
  getReportsMetrics,
  exportReport
} from '../controllers/dashboardController.js';
import { requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use('/reports', requireRole(['Super Admin', 'Admin', 'role-1', 'role-2']));
router.get('/reports/metrics', getReportsMetrics);
router.post('/reports/export', exportReport);

export default router;
