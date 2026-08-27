// ────────────────────────────────────────────────────────────────
//  Controller layer – thin async HTTP handlers over the services.
//  GET responses:  { success, data }  (plus `count` for lists)
//  POST responses: { success, message, data }
// ────────────────────────────────────────────────────────────────
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  getMetricsService,
  getCategoryMetricsService,
  getStatusBreakdownService,
  getChangeRequestsService,
  filterChangeRequestsByCategoryService,
  createChangeRequestService,
  getWorklistService,
  applyWorklistActionService,
  getCatalogService,
  getCatalogueManagementService,
  createCatalogItemService,
  getSettingsUsersService,
  getSettingsRolesService,
  getSettingsAuditLogsService,
  getReportsMetricsService
} from '../services/dashboardService.js';

// ---------- Dashboard analytics ---------------------------

export const getMetrics = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await getMetricsService() });
});

export const getCategories = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await getCategoryMetricsService() });
});

export const getStatusBreakdown = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await getStatusBreakdownService() });
});

// ---------- Change requests -------------------------------

export const getRecentRequests = asyncHandler(async (req, res) => {
  const requests = await getChangeRequestsService();
  const limit = parseInt(req.query.limit, 10);
  const data = Number.isNaN(limit) ? requests : requests.slice(0, limit);
  res.json({ success: true, count: data.length, data });
});

export const getMyRequests = asyncHandler(async (req, res) => {
  const data = await filterChangeRequestsByCategoryService(req.query.category);
  res.json({ success: true, count: data.length, data });
});

export const createChangeRequest = asyncHandler(async (req, res) => {
  const cr = await createChangeRequestService(req.body || {});
  res.status(201).json({
    success: true,
    message:
      cr.status === 'Draft' ? 'Change Request saved as draft' : 'Change Request created successfully',
    data: cr
  });
});

// ---------- CAB worklist --------------------------------

export const getWorklist = asyncHandler(async (req, res) => {
  res.json({ success: true, ...(await getWorklistService()) });
});

export const handleWorklistAction = asyncHandler(async (req, res) => {
  const { id, action } = req.body || {};
  if (!id || !action) {
    return res.status(400).json({ success: false, message: 'Both "id" and "action" are required' });
  }
  const result = await applyWorklistActionService({ id, action });
  res.json({ success: true, message: `Action "${action}" processed for ${id}`, data: result });
});

// ---------- Change catalog (browse) --------------------

export const getCatalog = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await getCatalogService() });
});

// ---------- Catalogue management (admin) ---------------

export const getCatalogueManagement = asyncHandler(async (req, res) => {
  res.json({ success: true, ...(await getCatalogueManagementService()) });
});

export const createCatalogItem = asyncHandler(async (req, res) => {
  const item = await createCatalogItemService(req.body || {});
  res.status(201).json({ success: true, message: 'Catalog item added successfully', data: item });
});

// ---------- Settings ----------------------------------

export const getSettingsUsers = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await getSettingsUsersService() });
});

export const getSettingsRoles = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await getSettingsRolesService() });
});

export const getSettingsAuditLogs = asyncHandler(async (req, res) => {
  const data = await getSettingsAuditLogsService(req.query.filter || 'All activity');
  res.json({ success: true, count: data.length, data });
});

// ---------- Reports ----------------------------------

export const getReportsMetrics = asyncHandler(async (req, res) => {
  res.json({ success: true, ...(await getReportsMetricsService()) });
});

export const exportReport = asyncHandler(async (req, res) => {
  const { format } = req.body || {};
  res.json({ success: true, message: `Report exported successfully as ${format || 'PDF'}` });
});
