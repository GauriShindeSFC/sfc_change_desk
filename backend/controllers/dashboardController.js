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
  filterChangeRequestsByCategoryService,
  createChangeRequestService,
  updateDraftChangeRequestService,
  submitDraftChangeRequestService,
  getWorklistService,
  applyWorklistActionService,
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
  markAllNotificationsAsReadService,
  getScheduledReportsService,
  createScheduledReportService,
  deleteScheduledReportService
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
  const page = req.query.page || 1;
  const limit = req.query.limit || 5;
  const result = await filterChangeRequestsByCategoryService('all', null, page, limit);
  res.json({ success: true, ...result });
});

export const getMyRequests = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const page = req.query.page || 1;
  const limit = req.query.limit || 10;
  const filterVal = req.query.status || req.query.category;
  const result = await filterChangeRequestsByCategoryService(filterVal, userId, page, limit, req.query.status);
  res.json({ success: true, ...result });
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
  const page = req.query.page || 1;
  const limit = req.query.limit || 10;
  res.json({ success: true, ...(await getWorklistService(userId, page, limit)) });
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

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
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

  if (format === 'pdf') {
    const { logoImage, monthlyChartImage, departmentChartImage, monthlyData: payloadMonthly, departmentData: payloadDept } = req.body || {};

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="change_requests_report.pdf"');

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    doc.pipe(res);

    const decodeBase64Image = (dataUrl) => {
      if (!dataUrl || typeof dataUrl !== 'string') return null;
      try {
        const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
        return Buffer.from(base64Data, 'base64');
      } catch (err) {
        return null;
      }
    };

    // Draw Uploaded Logo if available
    const logoBuffer = decodeBase64Image(logoImage);
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, 430, 30, { fit: [120, 40] });
      } catch (e) {
        console.warn('Failed to render logo in PDF:', e.message);
      }
    }

    // Document Header
    doc.fontSize(20).fillColor('#0F172A').text('Change Requests Performance Report', { align: 'left' });
    doc.fontSize(9).fillColor('#64748B').text(`Generated on ${new Date().toLocaleString()}`, { align: 'left' });
    doc.moveDown(1.5);

    // Summary Table Section
    doc.fontSize(13).fillColor('#0F172A').text('Change Requests Summary', { align: 'left' });
    doc.moveDown(0.5);

    const tableTop = doc.y;
    doc.fontSize(9).fillColor('#475569');
    doc.text('CR ID', 40, tableTop, { width: 70 });
    doc.text('Title', 110, tableTop, { width: 180 });
    doc.text('Category', 290, tableTop, { width: 100 });
    doc.text('Risk', 390, tableTop, { width: 60 });
    doc.text('Status', 450, tableTop, { width: 80 });

    doc.moveTo(40, tableTop + 14).lineTo(550, tableTop + 14).strokeColor('#CBD5E1').stroke();

    let currentY = tableTop + 20;
    const sampleRequests = requests.slice(0, 15);
    sampleRequests.forEach((r) => {
      if (currentY > 750) {
        doc.addPage();
        currentY = 40;
      }
      doc.fontSize(8.5).fillColor('#1E293B');
      doc.text(r.id || '', 40, currentY, { width: 70 });
      doc.text((r.title || '').substring(0, 30), 110, currentY, { width: 180 });
      doc.text(r.category || '', 290, currentY, { width: 100 });
      doc.text(r.risk || '', 390, currentY, { width: 60 });
      doc.text(r.status || '', 450, currentY, { width: 80 });
      currentY += 16;
    });

    // New Page for Embedded Charts
    doc.addPage();
    if (logoBuffer) {
      try {
        doc.image(logoBuffer, 430, 30, { fit: [120, 35] });
      } catch (e) {}
    }

    doc.fontSize(16).fillColor('#0F172A').text('Reports Analytics & Visual Charts', { align: 'left' });
    doc.moveDown(1.5);

    // Helper: Vector Monthly Bar Chart
    const renderMonthlyVectorChart = (dataList) => {
      const months = Array.isArray(dataList) && dataList.length > 0 ? dataList : [
        { month: 'Jan', count: 12 }, { month: 'Feb', count: 18 }, { month: 'Mar', count: 15 },
        { month: 'Apr', count: 22 }, { month: 'May', count: 28 }, { month: 'Jun', count: 35 },
        { month: 'Jul', count: 20 }, { month: 'Aug', count: 42 }
      ];
      const maxVal = Math.max(...months.map((m) => Number(m.count) || 0), 1);
      const startX = 50;
      const startY = doc.y + 10;
      const chartHeight = 110;
      const barWidth = Math.min(32, Math.floor(450 / months.length) - 8);

      months.forEach((m, idx) => {
        const count = Number(m.count) || 0;
        const barH = Math.max(4, Math.round((count / maxVal) * chartHeight));
        const x = startX + idx * (barWidth + 10);
        const y = startY + chartHeight - barH;

        doc.rect(x, y, barWidth, barH).fill('#0D9488');
        doc.fontSize(7.5).fillColor('#0F172A').text(String(count), x - 2, y - 10, { width: barWidth + 4, align: 'center' });
        doc.fontSize(7.5).fillColor('#64748B').text(m.month || '', x - 4, startY + chartHeight + 4, { width: barWidth + 8, align: 'center' });
      });
      doc.y = startY + chartHeight + 30;
    };

    // Helper: Vector Department Horizontal Bar Chart
    const renderDeptVectorChart = (dataList) => {
      const depts = Array.isArray(dataList) && dataList.length > 0 ? dataList : [
        { name: 'IT Operations', count: 45 },
        { name: 'Cloud Infrastructure', count: 32 },
        { name: 'Cybersecurity', count: 24 },
        { name: 'Software Engineering', count: 18 }
      ];
      const maxVal = Math.max(...depts.map((d) => Number(d.count) || 0), 1);
      let startY = doc.y + 10;

      depts.slice(0, 5).forEach((d) => {
        const count = Number(d.count) || 0;
        const barW = Math.max(10, Math.round((count / maxVal) * 250));

        doc.fontSize(8.5).fillColor('#1E293B').text(d.name || '', 50, startY, { width: 140 });
        doc.rect(200, startY + 1, barW, 10).fill('#2563EB');
        doc.fontSize(8).fillColor('#64748B').text(`${count} Change Requests`, 208 + barW, startY + 1);
        startY += 18;
      });
      doc.y = startY + 10;
    };

    // Monthly Volume Chart Section
    doc.fontSize(13).fillColor('#0F172A').text('Monthly Volume', { align: 'left' });
    doc.moveDown(0.5);
    const monthlyImgBuffer = decodeBase64Image(monthlyChartImage);
    if (monthlyImgBuffer) {
      try {
        doc.image(monthlyImgBuffer, { fit: [470, 180], align: 'center' });
      } catch (e) {
        renderMonthlyVectorChart(payloadMonthly);
      }
    } else {
      renderMonthlyVectorChart(payloadMonthly);
    }

    doc.moveDown(1.5);

    // Top Requesting Departments Chart Section
    doc.fontSize(13).fillColor('#0F172A').text('Top Requesting Departments', { align: 'left' });
    doc.moveDown(0.5);
    const deptImgBuffer = decodeBase64Image(departmentChartImage);
    if (deptImgBuffer) {
      try {
        doc.image(deptImgBuffer, { fit: [470, 180], align: 'center' });
      } catch (e) {
        renderDeptVectorChart(payloadDept);
      }
    } else {
      renderDeptVectorChart(payloadDept);
    }

    doc.end();
    return;
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

export const getScheduledReports = asyncHandler(async (req, res) => {
  const data = await getScheduledReportsService();
  res.json({ success: true, count: data.length, data });
});

export const createScheduledReport = asyncHandler(async (req, res) => {
  const userId = req.user?.id || 'usr-1';
  const report = await createScheduledReportService(req.body, userId);
  res.status(201).json({ success: true, message: 'Scheduled report created successfully', data: report });
});

export const deleteScheduledReport = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await deleteScheduledReportService(id);
  res.json({ success: true, message: 'Scheduled report deleted successfully' });
});
