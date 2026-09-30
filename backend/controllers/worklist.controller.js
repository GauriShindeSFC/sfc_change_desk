import { asyncHandler } from '../utils/asyncHandler.js';
import {
  getFilteredChangeRequests,
  applyWorklistActionService,
  addChangeRequestCommentService
} from '../services/dashboard.service.js';
import { getPreSpendRequestsService } from '../services/preSpend.service.js';
import { getTravelRequestsService } from '../services/travelDesk.service.js';

export const getWorklist = asyncHandler(async (req, res) => {
  const userId = req.user?.userKey || req.user?.id;
  const organizationScope = ['organization', 'org'].includes(String(req.query.scope || '').toLowerCase());
  const page = req.query.page || 1;
  const limit = req.query.limit || 10;
  const status = req.query.status || null;
  const dateFilter = req.query.dateFilter || null;
  const startDate = req.query.startDate || null;
  const endDate = req.query.endDate || null;
  const searchQuery = req.query.search || req.query.searchQuery || null;

  const result = await getFilteredChangeRequests({
    userId: null,
    currentUser: req.user,
    isWorklist: true,
    actingUserId: userId,
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

// Sidebar pending-count dots for all 3 modules in one round-trip, instead of the
// frontend hitting /worklist, /pre-spend and /travel-desk separately. `limit: 1`
// keeps the row payload minimal — actionableCount itself is always computed from
// a full, unpaginated query inside each service, so it stays accurate regardless
// of the page size requested here.
export const getWorklistCounts = asyncHandler(async (req, res) => {
  const userId = req.user?.userKey || req.user?.id;

  const [crResult, psResult, trResult] = await Promise.all([
    getFilteredChangeRequests({ userId: null, currentUser: req.user, isWorklist: true, actingUserId: userId, page: 1, limit: 1 }),
    getPreSpendRequestsService({ user: req.user, isWorklist: true, page: 1, limit: 1 }),
    getTravelRequestsService({ user: req.user, isWorklist: true, page: 1, limit: 1 })
  ]);

  res.json({
    success: true,
    data: {
      change_request: crResult.actionableCount || 0,
      prespend: psResult.actionableCount || 0,
      travel: trResult.actionableCount || 0
    }
  });
});

export const handleWorklistAction = asyncHandler(async (req, res) => {
  const { id, action, rejectionReason, comment, rationale } = req.body || {};
  if (!id || !action) {
    return res.status(400).json({ success: false, message: 'Both "id" and "action" are required' });
  }
  const actionComment = (comment || rejectionReason || rationale || '').trim();
  const actorId = req.user?.userKey || req.user?.id;
  const result = await applyWorklistActionService({ id, action, rejectionReason: actionComment, comment: actionComment, actorId });
  res.json({ success: true, message: `Action "${action}" processed for ${id}`, data: result });
});

export const addChangeRequestComment = asyncHandler(async (req, res) => {
  const { id, text, commentText } = req.body || {};
  const content = text || commentText;
  if (!id || !content) {
    return res.status(400).json({ success: false, message: 'Both "id" and comment text are required' });
  }
  const result = await addChangeRequestCommentService({ id, commentText: content, actorId: req.user?.id });
  res.json({ success: true, message: 'Comment posted successfully', data: result });
});
