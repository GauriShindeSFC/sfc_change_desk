import express from 'express';
import {
  getReportsMetrics,
  exportReport
} from '../controllers/dashboardController.js';

const router = express.Router();

router.get('/reports/metrics', getReportsMetrics);
router.post('/reports/export', exportReport);

export default router;
