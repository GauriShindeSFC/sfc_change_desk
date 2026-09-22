import express from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  createTravelService,
  getTravelRequestsService,
  handleTravelActionService
} from '../services/travelDesk.service.js';

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const isWorklist = req.query.view === 'worklist';
  const isOrgWorklist = req.query.scope === 'organization';
  const currentUser = req.user || (req.headers['x-user-id'] ? { id: req.headers['x-user-id'] } : null);
  const result = await getTravelRequestsService({
    user: currentUser,
    isWorklist,
    isOrgWorklist,
    status: req.query.status,
    searchQuery: req.query.search,
    page: req.query.page || 1,
    limit: req.query.limit || 10
  });
  res.json({ success: true, ...result });
}));

router.post('/', asyncHandler(async (req, res) => {
  const item = await createTravelService(req.body, req.user);
  res.status(201).json({
    success: true,
    message: `Travel booking request ${item.requestCode} created successfully`,
    data: item
  });
}));

router.post('/action', asyncHandler(async (req, res) => {
  const { id, action, comment, rejectionReason } = req.body || {};
  const updated = await handleTravelActionService({
    id,
    action,
    comment: comment || rejectionReason,
    actor: req.user
  });
  res.json({
    success: true,
    message: `Travel request ${id} ${action}d successfully`,
    data: updated
  });
}));

export default router;
