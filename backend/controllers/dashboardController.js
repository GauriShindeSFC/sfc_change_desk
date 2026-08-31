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
  updateDraftChangeRequestService,
  submitDraftChangeRequestService,
  getWorklistService,
  applyWorklistActionService,
  getCatalogService,
  getCatalogCategoriesService,
  getCatalogSubcategoriesService,
  getSubcategoryFieldsService,
  getCatalogueManagementService,
  createCatalogSubcategoryService,
  createWorkflowService,
  getSettingsUsersService,
  createSettingsUserService,
  getSettingsRolesService,
  updateRolePermissionsService,
  getSettingsAuditLogsService,
  getReportsMetricsService,
  getUserNotificationsService,
  markNotificationAsReadService,
  markAllNotificationsAsReadService
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
  const userId = req.user?.id;
  const data = await filterChangeRequestsByCategoryService(req.query.category, userId);
  res.json({ success: true, count: data.length, data });
});

export const createChangeRequest = asyncHandler(async (req, res) => {
  const cr = await createChangeRequestService({
    ...(req.body || {}),
    requesterId: req.user?.id || req.body?.requesterId
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
  const updated = await updateDraftChangeRequestService(id, req.user?.id, req.body || {});
  res.json({ success: true, message: 'Draft updated successfully', data: updated });
});

export const submitDraftChangeRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const cr = await submitDraftChangeRequestService(id, req.user?.id);
  res.json({
    success: true,
    message: `Change Request ${id} submitted for approval`,
    data: cr
  });
});

// ---------- CAB worklist --------------------------------

export const getWorklist = asyncHandler(async (req, res) => {
  const userId = req.user?.id || 'usr-1';
  res.json({ success: true, ...(await getWorklistService(userId)) });
});

export const handleWorklistAction = asyncHandler(async (req, res) => {
  const { id, action, rejectionReason } = req.body || {};
  if (!id || !action) {
    return res.status(400).json({ success: false, message: 'Both "id" and "action" are required' });
  }
  const result = await applyWorklistActionService({ id, action, rejectionReason, actorId: req.user?.id });
  res.json({ success: true, message: `Action "${action}" processed for ${id}`, data: result });
});

// ---------- Change catalog (browse) --------------------

export const getCatalog = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await getCatalogService() });
});

export const getCatalogCategories = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await getCatalogCategoriesService() });
});

export const getCatalogSubcategories = asyncHandler(async (req, res) => {
  const { id } = req.params;
  res.json({ success: true, data: await getCatalogSubcategoriesService(id) });
});

export const getSubcategoryFields = asyncHandler(async (req, res) => {
  const { id } = req.params;
  res.json({ success: true, data: await getSubcategoryFieldsService(id) });
});

// ---------- Catalogue management (admin) ---------------

export const getCatalogueManagement = asyncHandler(async (req, res) => {
  res.json({ success: true, ...(await getCatalogueManagementService()) });
});



export const createCatalogSubcategory = asyncHandler(async (req, res) => {
  const { categoryId, name, sla, risk, workflowId, description } = req.body || {};
  if (!categoryId || !name) {
    return res.status(400).json({ success: false, message: 'categoryId and name are required' });
  }

  const subcategory = await createCatalogSubcategoryService({
    categoryId,
    name,
    sla,
    risk,
    workflowId,
    description,
    actor: req.user?.name
  });

  res.status(201).json({ success: true, message: 'Sub-category created successfully', data: subcategory });
});

export const createWorkflow = asyncHandler(async (req, res) => {
  const wf = await createWorkflowService(req.body || {});
  res.status(201).json({ success: true, message: 'Workflow created successfully', data: wf });
});

// ---------- Settings ----------------------------------

export const getSettingsUsers = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await getSettingsUsersService() });
});

export const createSettingsUser = asyncHandler(async (req, res) => {
  const user = await createSettingsUserService(req.body || {}, {
    actorId: req.user?.id,
    invitedByName: req.user?.name
  });
  res.status(201).json({ success: true, message: 'User invited — a sign-in email has been sent', data: user });
});

export const getSettingsRoles = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await getSettingsRolesService() });
});

export const updateRolePermissions = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { permissions = [] } = req.body || {};
  const role = await updateRolePermissionsService(id, permissions);
  res.json({ success: true, message: 'Role permissions updated successfully', data: role });
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
  const format = (req.body?.format || req.query?.format || 'csv').toLowerCase();
  const requests = await getChangeRequestsService();

  if (format === 'csv') {
    const headers = ['CR ID', 'Title', 'Category', 'Risk', 'Status', 'Submitted At'];
    const rows = requests.map(r => [
      `"${r.id}"`,
      `"${(r.title || '').replace(/"/g, '""')}"`,
      `"${r.category}"`,
      `"${r.risk}"`,
      `"${r.status}"`,
      `"${r.raisedDate}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="change_requests_report.csv"');
    return res.send(csvContent);
  }

  res.json({ success: true, message: `Report exported successfully as ${format.toUpperCase()}` });
});

// ---------- Notifications -----------------------------

export const getUserNotifications = asyncHandler(async (req, res) => {
  const userId = req.user?.id || req.headers['x-user-id'] || 'usr-1';
  const result = await getUserNotificationsService(userId);
  res.json({ success: true, ...result });
});

export const markNotificationAsRead = asyncHandler(async (req, res) => {
  const userId = req.user?.id || req.headers['x-user-id'] || 'usr-1';
  const { id } = req.params;
  const result = await markNotificationAsReadService(id, userId);
  res.json({ success: true, ...result });
});

export const markAllNotificationsAsRead = asyncHandler(async (req, res) => {
  const userId = req.user?.id || req.headers['x-user-id'] || 'usr-1';
  const result = await markAllNotificationsAsReadService(userId);
  res.json({ success: true, ...result });
});
