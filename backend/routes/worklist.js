import express from 'express';
import {
  getWorklist,
  handleWorklistAction,
  addChangeRequestComment
} from '../controllers/dashboardController.js';
import { requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/worklist', requireRole(['Change Manager', 'Admin', 'Super Admin']), getWorklist);
router.get('/my-worklist', requireRole(['Change Manager', 'Admin', 'Super Admin']), getWorklist);
router.post('/worklist/action', requireRole(['Change Manager', 'Admin', 'Super Admin']), handleWorklistAction);
router.post('/worklist/comment', requireRole(['Admin', 'Super Admin']), addChangeRequestComment);

export default router;
