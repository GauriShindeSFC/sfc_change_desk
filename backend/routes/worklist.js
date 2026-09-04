import express from 'express';
import {
  getWorklist,
  handleWorklistAction
} from '../controllers/dashboardController.js';
import { requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/worklist', getWorklist);
router.post('/worklist/action', requireRole(['Change Manager', 'Admin', 'Super Admin']), handleWorklistAction);

export default router;
