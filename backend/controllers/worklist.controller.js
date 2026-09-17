import { asyncHandler } from '../utils/asyncHandler.js';
import {
  getFilteredChangeRequests,
  applyWorklistActionService,
  addChangeRequestCommentService
} from '../services/dashboard.service.js';

export const getWorklist = asyncHandler(async (req, res) => {
  const userId = req.user?.userKey || req.user?.id || req.headers['x-user-id'];
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

export const handleWorklistAction = asyncHandler(async (req, res) => {
  const { id, action, rejectionReason, comment, rationale } = req.body || {};
  if (!id || !action) {
    return res.status(400).json({ success: false, message: 'Both "id" and "action" are required' });
  }
  const actionComment = comment || rationale || rejectionReason || '';
  const result = await applyWorklistActionService({ id, action, rejectionReason: actionComment, comment: actionComment, actorId: req.user?.id });
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
