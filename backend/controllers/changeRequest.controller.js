import { asyncHandler } from '../utils/asyncHandler.js';
import {
  getFilteredChangeRequests,
  createChangeRequestService,
  updateDraftChangeRequestService,
  submitDraftChangeRequestService
} from '../services/dashboard.service.js';

export const getMyRequests = asyncHandler(async (req, res) => {
  const organizationScope = ['organization', 'org'].includes(String(req.query.scope || '').toLowerCase());
  const userId = organizationScope ? null : (req.user?.userKey || req.user?.id || req.headers['x-user-id']);
  const page = req.query.page || 1;
  const limit = req.query.limit || 10;
  const status = req.query.status || null;
  const dateFilter = req.query.dateFilter || null;
  const startDate = req.query.startDate || null;
  const endDate = req.query.endDate || null;
  const searchQuery = req.query.search || req.query.searchQuery || null;

  const result = await getFilteredChangeRequests({
    userId,
    isWorklist: false,
    status,
    dateFilter,
    startDate,
    endDate,
    searchQuery,
    organizationScope,
    page,
    limit
  });
  res.json({ success: true, ...result });
});

export const createChangeRequest = asyncHandler(async (req, res) => {
  const cr = await createChangeRequestService({
    ...(req.body || {}),
    userKey: req.user?.userKey || req.user?.id,
    requesterId: req.user?.userKey || req.user?.id || req.body?.requesterId,
    currentUser: req.user
  });
  res.status(201).json({
    success: true,
    message:
      cr.status === 'Draft' ? 'Change Request saved as draft' : 'Change Request created successfully',
    data: cr
  });
});

export const updateDraftChangeRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updated = await updateDraftChangeRequestService(id, req.user?.userKey || req.user?.id, req.body || {});
  res.json({ success: true, message: 'Draft updated successfully', data: updated });
});

export const submitDraftChangeRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const cr = await submitDraftChangeRequestService(id, req.user?.userKey || req.user?.id);
  res.json({
    success: true,
    message: `Change Request ${id} submitted for approval`,
    data: cr
  });
});
