// ────────────────────────────────────────────────────────────────
//  Controller layer – thin async HTTP handlers over the services.
//  GET responses:  { success, data }  (plus `count` for lists)
//  POST responses: { success, message, data }
// ────────────────────────────────────────────────────────────────
import PDFDocument from 'pdfkit';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  getMetricsService,
  getCategoryMetricsService,
  getStatusBreakdownService,
  getChangeRequestsService,
  getFilteredChangeRequests,
  createChangeRequestService,
  updateDraftChangeRequestService,
  submitDraftChangeRequestService,
  getWorklistService,
  applyWorklistActionService,
  addChangeRequestCommentService,
  getCatalogCategoriesService,
  getCatalogSubcategoriesService,
  getSubcategoryFieldsService,
  createCatalogSubcategoryService,
  getSettingsUsersService,
  createSettingsUserService,
  updateSettingsUserService,
  getSettingsRolesService,
  updateRolePermissionsService,
  getSettingsAuditLogsService,
  getChangeManagerCategoriesService,
  updateChangeManagerCategoriesService,
  getChangeImplementerCategoriesService,
  updateChangeImplementerCategoriesService
} from '../services/dashboardService.js';

// ---------- Dashboard analytics ---------------------------

export const getMetrics = asyncHandler(async (req, res) => {
  const isOrgScope = req.query.scope === 'organization' || req.query.scope === 'org';
  const userId = isOrgScope ? null : (req.user?.userKey || req.user?.id || req.headers['x-user-id'] || req.query.userId || null);
  if (!isOrgScope && !userId) {
    return res.status(401).json({ success: false, message: 'Authentication required for personal metrics.' });
  }
  const { dateFilter, startDate, endDate, status, search, searchQuery } = req.query;
  res.json({ success: true, data: await getMetricsService(userId, { dateFilter, startDate, endDate, status, searchQuery: search || searchQuery }) });
});

export const getCategories = asyncHandler(async (req, res) => {
  const isOrgScope = req.query.scope === 'organization' || req.query.scope === 'org';
  const userId = isOrgScope ? null : (req.user?.userKey || req.user?.id || req.headers['x-user-id'] || req.query.userId || null);
  if (!isOrgScope && !userId) {
    return res.status(401).json({ success: false, message: 'Authentication required for personal categories.' });
  }
  const { dateFilter, startDate, endDate, status, search, searchQuery } = req.query;
  res.json({ success: true, data: await getCategoryMetricsService(userId, { dateFilter, startDate, endDate, status, searchQuery: search || searchQuery }) });
});

export const getStatusBreakdown = asyncHandler(async (req, res) => {
  const isOrgScope = req.query.scope === 'organization' || req.query.scope === 'org';
  const userId = isOrgScope ? null : (req.user?.userKey || req.user?.id || req.headers['x-user-id'] || req.query.userId || null);
  if (!isOrgScope && !userId) {
    return res.status(401).json({ success: false, message: 'Authentication required for personal status breakdown.' });
  }
  const { dateFilter, startDate, endDate, status, search, searchQuery } = req.query;
  res.json({ success: true, data: await getStatusBreakdownService(userId, { dateFilter, startDate, endDate, status, searchQuery: search || searchQuery }) });
});

// ---------- Change requests -------------------------------

export const getMyRequests = asyncHandler(async (req, res) => {
  const organizationScope = ['organization', 'org'].includes(String(req.query.scope || '').toLowerCase());
  const userId = organizationScope ? null : (req.user?.userKey || req.user?.id || req.headers['x-user-id'] || null);
  if (!organizationScope && !userId) {
    return res.status(401).json({ success: false, message: 'Authentication required to view personal requests.' });
  }
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

// ---------- CAB worklist --------------------------------

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

// ---------- Change catalog (browse) --------------------

export const getCatalog = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await getCatalogCategoriesService() });
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

export const updateSettingsUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await updateSettingsUserService(id, req.body || {}, {
    actorId: req.user?.id
  });
  res.json({ success: true, message: 'User updated successfully', data: user });
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

export const exportAuditLogs = asyncHandler(async (req, res) => {
  const format = (req.body?.format || req.query?.format || 'excel').toLowerCase();
  const filter = req.body?.filter || req.query?.filter || 'All activity';

  const logs = await getSettingsAuditLogsService(filter);

  if (format === 'excel' || format === 'xlsx' || format === 'csv') {
    const headers = ['Log ID', 'Timestamp', 'Actor', 'Action', 'Reference', 'Employee Email', 'Category'];
    const rows = logs.map(l => [
      `"${l.id}"`,
      `"${l.timestamp || ''}"`,
      `"${(l.actor || '').replace(/"/g, '""')}"`,
      `"${(l.action || '').replace(/"/g, '""')}"`,
      `"${(l.reference || '').replace(/"/g, '""')}"`,
      `"${(l.employeeEmail || '').replace(/"/g, '""')}"`,
      `"${(l.category || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="audit_logs_report.csv"');
    return res.send(csvContent);
  }

  if (format === 'pdf') {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="audit_logs_report.pdf"');

    const PDFDoc = PDFDocument.default || PDFDocument;
    const doc = new PDFDoc({ margin: 40, size: 'A4' });
    doc.pipe(res);

    // Title & Header
    doc.fontSize(18).fillColor('#0F172A').text('System Audit Logs Report', { align: 'left' });
    doc.fontSize(9).fillColor('#64748B').text(`Filter: ${filter}  |  Generated on ${new Date().toLocaleString()}`, { align: 'left' });
    doc.moveDown(1.5);

    // Table Header
    const tableTop = doc.y;
    doc.fontSize(9).fillColor('#475569');
    doc.text('Timestamp', 40, tableTop, { width: 120 });
    doc.text('Actor', 160, tableTop, { width: 110 });
    doc.text('Action', 270, tableTop, { width: 110 });
    doc.text('Reference', 380, tableTop, { width: 80 });
    doc.text('Email', 460, tableTop, { width: 95 });

    doc.moveTo(40, tableTop + 14).lineTo(555, tableTop + 14).strokeColor('#CBD5E1').stroke();

    let currentY = tableTop + 20;
    logs.forEach((l) => {
      if (currentY > 750) {
        doc.addPage();
        currentY = 40;
      }
      doc.fontSize(8.5).fillColor('#1E293B');
      doc.text(String(l.timestamp || ''), 40, currentY, { width: 115 });
      doc.text(String(l.actor || '').substring(0, 18), 160, currentY, { width: 105 });
      doc.text(String(l.action || '').substring(0, 18), 270, currentY, { width: 105 });
      doc.text(String(l.reference || ''), 380, currentY, { width: 75 });
      doc.text(String(l.employeeEmail || '').substring(0, 16), 460, currentY, { width: 95 });
      currentY += 16;
    });

    doc.end();
    return;
  }

  res.json({ success: true, message: `Audit logs exported as ${format.toUpperCase()}` });
});

// ---------- Change Manager Categories ------------------


export const getChangeManagerCategories = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const data = await getChangeManagerCategoriesService(userId);
  res.json({ success: true, count: data.length, data });
});

export const updateChangeManagerCategories = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { categoryIds } = req.body;
  const data = await updateChangeManagerCategoriesService(userId, categoryIds || []);
  res.json({ success: true, message: 'Change manager categories updated successfully', data });
});

// ---------- Change Implementer Categories --------------

export const getChangeImplementerCategories = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const data = await getChangeImplementerCategoriesService(userId);
  res.json({ success: true, count: data.length, data });
});

export const updateChangeImplementerCategories = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { categoryIds } = req.body;
  const data = await updateChangeImplementerCategoriesService(userId, categoryIds || []);
  res.json({ success: true, message: 'Change implementer categories updated successfully', data });
});

