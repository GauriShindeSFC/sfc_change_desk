import express from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  createPreSpendService,
  getPreSpendRequestsService,
  handlePreSpendActionService
} from '../services/preSpend.service.js';

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const isWorklist = req.query.view === 'worklist';
  const userId = isWorklist ? null : (req.user?.userKey || req.user?.id || req.headers['x-user-id']);
  const result = await getPreSpendRequestsService({
    userId,
    isWorklist,
    status: req.query.status,
    searchQuery: req.query.search,
    page: req.query.page || 1,
    limit: req.query.limit || 10
  });
  res.json({ success: true, ...result });
}));

router.post('/', asyncHandler(async (req, res) => {
  const item = await createPreSpendService(req.body, req.user);
  res.status(201).json({
    success: true,
    message: `Pre-spend requisition ${item.requestCode} created successfully`,
    data: item
  });
}));

router.post('/action', asyncHandler(async (req, res) => {
  const { id, action, comment, rejectionReason } = req.body || {};
  const updated = await handlePreSpendActionService({
    id,
    action,
    comment: comment || rejectionReason,
    actor: req.user
  });
  res.json({
    success: true,
    message: `Pre-spend request ${id} ${action}d successfully`,
    data: updated
  });
}));

export default router;
