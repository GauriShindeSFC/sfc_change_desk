import express from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  createPreSpendService,
  getPreSpendRequestsService,
  handlePreSpendActionService,
  getPastVendorBySubcategoryService
} from '../services/preSpend.service.js';

const router = express.Router();

router.get('/past-vendor', asyncHandler(async (req, res) => {
  const { subcategory, category } = req.query;
  const result = await getPastVendorBySubcategoryService(subcategory, category);
  res.json({ success: true, data: result });
}));

router.get('/', asyncHandler(async (req, res) => {
  const isWorklist = req.query.view === 'worklist';
  const isOrgWorklist = req.query.scope === 'organization' || req.query.scope === 'org';
  const organizationScope = isOrgWorklist;
  const currentUser = req.user || (req.headers['x-user-id'] ? { id: req.headers['x-user-id'] } : null);
  const result = await getPreSpendRequestsService({
    user: currentUser,
    isWorklist,
    isOrgWorklist,
    organizationScope,
    status: req.query.status,
    searchQuery: req.query.search,
    dateFilter: req.query.dateFilter,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
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
