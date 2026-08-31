import express from 'express';
import {
  getReportsMetrics,
  exportReport,
  getScheduledReports,
  createScheduledReport,
  deleteScheduledReport
} from '../controllers/dashboardController.js';

const router = express.Router();

router.get('/reports/metrics', getReportsMetrics);
router.post('/reports/export', exportReport);
router.get('/reports/schedules', getScheduledReports);
router.post('/reports/schedules', createScheduledReport);
router.delete('/reports/schedules/:id', deleteScheduledReport);

export default router;
