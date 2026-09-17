// ────────────────────────────────────────────────────────────────
//  Dashboard Controller – thin async HTTP handlers for Dashboard metrics & exports
// ────────────────────────────────────────────────────────────────
import PDFDocument from 'pdfkit';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  getMetricsService,
  getCategoryMetricsService,
  getStatusBreakdownService,
  getFilteredChangeRequests
} from '../services/dashboard.service.js';

// ---------- Dashboard analytics ---------------------------

export const getMetrics = asyncHandler(async (req, res) => {
  const isOrgScope = req.query.scope === 'organization' || req.query.scope === 'org';
  const userId = isOrgScope ? null : (req.user?.userKey || req.user?.id || req.headers['x-user-id'] || req.query.userId || null);
  if (!isOrgScope && !userId) {
    return res.status(401).json({ success: false, message: 'Unauthorized: Personal dashboard scope requires valid user identity.' });
  }
  const { dateFilter, startDate, endDate, status } = req.query;
  const searchQuery = req.query.search || req.query.searchQuery || null;
  res.json({ success: true, data: await getMetricsService(userId, { dateFilter, startDate, endDate, status, searchQuery }) });
});

export const getCategories = asyncHandler(async (req, res) => {
  const isOrgScope = req.query.scope === 'organization' || req.query.scope === 'org';
  const userId = isOrgScope ? null : (req.user?.userKey || req.user?.id || req.headers['x-user-id'] || req.query.userId || null);
  if (!isOrgScope && !userId) {
    return res.status(401).json({ success: false, message: 'Unauthorized: Personal dashboard scope requires valid user identity.' });
  }
  const { dateFilter, startDate, endDate } = req.query;
  res.json({ success: true, data: await getCategoryMetricsService(userId, { dateFilter, startDate, endDate }) });
});

export const getStatusBreakdown = asyncHandler(async (req, res) => {
  const isOrgScope = req.query.scope === 'organization' || req.query.scope === 'org';
  const userId = isOrgScope ? null : (req.user?.userKey || req.user?.id || req.headers['x-user-id'] || req.query.userId || null);
  if (!isOrgScope && !userId) {
    return res.status(401).json({ success: false, message: 'Unauthorized: Personal dashboard scope requires valid user identity.' });
  }
  const { dateFilter, startDate, endDate } = req.query;
  res.json({ success: true, data: await getStatusBreakdownService(userId, { dateFilter, startDate, endDate }) });
});

// ---------- Organization Dashboard Export (CSV & PDF) -----

export const exportDashboardData = asyncHandler(async (req, res) => {
  const format = (req.query?.format || req.body?.format || 'csv').toLowerCase();
  const { dateFilter, startDate, endDate, status } = req.query;
  const searchQuery = req.query.search || req.query.searchQuery || null;

  // 1. Fetch Categories, Status Breakdown, and Change Requests in Organization Scope
  const [categories, statusBreakdown, crResult] = await Promise.all([
    getCategoryMetricsService(null, { dateFilter, startDate, endDate }),
    getStatusBreakdownService(null, { dateFilter, startDate, endDate }),
    getFilteredChangeRequests({
      userId: null,
      organizationScope: true,
      status: status && status !== 'All' ? status : null,
      dateFilter,
      startDate,
      endDate,
      searchQuery,
      limit: 10000,
      page: 1
    })
  ]);

  const changeRequests = crResult?.data || [];
  const dateStamp = new Date().toISOString().slice(0, 10);

  // Calculate Requests by Location
  const locationMap = new Map();
  changeRequests.forEach((cr) => {
    const loc = String(cr.location || 'Unspecified').trim() || 'Unspecified';
    locationMap.set(loc, (locationMap.get(loc) || 0) + 1);
  });
  const totalLocationsCount = changeRequests.length;
  const locationStats = Array.from(locationMap.entries())
    .map(([location, count]) => ({
      location,
      count,
      percentage: totalLocationsCount > 0 ? Math.round((count / totalLocationsCount) * 100) : 0
    }))
    .sort((a, b) => b.count - a.count);

  // 2. CSV Generation
  if (format === 'csv' || format === 'excel' || format === 'xlsx') {
    const lines = [];

    // Header metadata
    lines.push('ORGANIZATION DASHBOARD REPORT');
    lines.push(`"Generated At","${new Date().toLocaleString()}"`);
    lines.push(`"Date Filter","${dateFilter || 'overall'}${dateFilter === 'custom' ? ` (${startDate} to ${endDate})` : ''}"`);
    lines.push(`"Status Filter","${status || 'All'}"`);
    if (searchQuery) lines.push(`"Search Query","${String(searchQuery).replace(/"/g, '""')}"`);
    lines.push('');

    // Section 1: Tickets by Category
    lines.push('--- TICKETS BY CATEGORY ---');
    lines.push('"Category","Ticket Count","Percentage"');
    (categories || []).forEach((c) => {
      const name = (c.category || c.label || c.name || '').replace(/"/g, '""');
      const count = c.count || 0;
      const pct = `${c.percentage || 0}%`;
      lines.push(`"${name}",${count},"${pct}"`);
    });
    lines.push('');

    // Section 2: Status Breakdown
    lines.push('--- STATUS BREAKDOWN ---');
    lines.push('"Status","Ticket Count","Percentage"');
    const totalCRs = (statusBreakdown || []).reduce((sum, s) => sum + (s.count || 0), 0);
    (statusBreakdown || []).forEach((s) => {
      const name = (s.label || s.status || '').replace(/"/g, '""');
      const count = s.count || 0;
      const pct = totalCRs > 0 ? `${Math.round((count / totalCRs) * 100)}%` : '0%';
      lines.push(`"${name}",${count},"${pct}"`);
    });
    lines.push('');

    // Section 3: Requests by Location
    lines.push('--- REQUESTS BY LOCATION ---');
    lines.push('"Location","Ticket Count","Percentage"');
    locationStats.forEach((l) => {
      lines.push(`"${l.location.replace(/"/g, '""')}",${l.count},"${l.percentage}%"`);
    });
    lines.push('');

    // Section 4: Organization Change Requests Table
    lines.push('--- ORGANIZATION CHANGE REQUESTS ---');
    lines.push('"CR ID","Title","Category","Subcategory","Location","Requester Name","Requester Email","Raised Date","Closed Date","Approved By","Status","Priority"');
    changeRequests.forEach((cr) => {
      const reqEmail = cr.employeeEmail || cr.requesterEmail || '';
      const reqName = cr.employeeName || cr.requester || cr.requesterName || (reqEmail ? reqEmail.split('@')[0] : '—');
      const approver = cr.status === 'Rejected'
        ? (cr.rejectedBy || cr.decidedBy || '—')
        : (cr.approvedBy || cr.decidedBy || (['Approved', 'Implemented'].includes(cr.status) ? 'Approver' : '—'));

      lines.push([
        `"${(cr.id || '').replace(/"/g, '""')}"`,
        `"${(cr.title || '').replace(/"/g, '""')}"`,
        `"${(cr.category || '').replace(/"/g, '""')}"`,
        `"${(cr.subCategory || cr.subcategory || '').replace(/"/g, '""')}"`,
        `"${(cr.location || 'Unspecified').replace(/"/g, '""')}"`,
        `"${reqName.replace(/"/g, '""')}"`,
        `"${reqEmail.replace(/"/g, '""')}"`,
        `"${(cr.raisedDate || cr.submittedAt || '').replace(/"/g, '""')}"`,
        `"${(cr.closedDate || '—').replace(/"/g, '""')}"`,
        `"${approver.replace(/"/g, '""')}"`,
        `"${(cr.status || '').replace(/"/g, '""')}"`,
        `"${(cr.priority || 'Medium').replace(/"/g, '""')}"`
      ].join(','));
    });

    const csvContent = '\uFEFF' + lines.join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="organization_dashboard_${dateStamp}.csv"`);
    return res.send(csvContent);
  }

  // 3. PDF Generation
  if (format === 'pdf') {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="organization_dashboard_${dateStamp}.pdf"`);

    const PDFDoc = PDFDocument.default || PDFDocument;
    const doc = new PDFDoc({ margin: 36, size: 'A4', bufferPages: true });
    doc.pipe(res);

    const primaryColor = '#1E3A8A';
    const darkText = '#0F172A';
    const mutedText = '#64748B';
    const borderColor = '#E2E8F0';
    const zebraBg = '#F8FAFC';

    // Top Header Banner
    doc.fontSize(10).fillColor(primaryColor).text('SFC CHANGE DESK', 36, 36, { characterSpacing: 1.5 });
    doc.fontSize(18).fillColor(darkText).text('Organization Dashboard Report', 36, 50);
    doc.fontSize(8.5).fillColor(mutedText).text(
      `Generated on ${new Date().toLocaleString()}  |  Scope: Organization  |  Total Requests: ${changeRequests.length}`,
      36,
      72
    );
    const filterDesc = `Date Filter: ${dateFilter || 'Overall'}${dateFilter === 'custom' ? ` (${startDate} to ${endDate})` : ''}  |  Status Filter: ${status || 'All'}${searchQuery ? `  |  Search: "${searchQuery}"` : ''}`;
    doc.fontSize(8.5).fillColor(mutedText).text(filterDesc, 36, 84);

    doc.moveTo(36, 100).lineTo(559, 100).strokeColor(borderColor).lineWidth(1).stroke();

    // Summary Section: Category, Status & Location side by side (3 columns)
    let currentY = 112;
    doc.fontSize(11).fillColor(darkText).text('Summary Analytics', 36, currentY);
    currentY += 16;

    const col1X = 36;
    const col2X = 215;
    const col3X = 390;

    // Column Headers
    doc.fontSize(9).fillColor(primaryColor).text('Tickets by Category', col1X, currentY);
    doc.fontSize(9).fillColor(primaryColor).text('Status Breakdown', col2X, currentY);
    doc.fontSize(9).fillColor(primaryColor).text('Requests by Location', col3X, currentY);
    currentY += 14;

    // Col 1: Category summary rows
    let catY = currentY;
    (categories || []).slice(0, 6).forEach((c) => {
      doc.fontSize(7.5).fillColor(darkText).text(c.category || c.name || '', col1X, catY, { width: 110 });
      doc.fontSize(7.5).fillColor(mutedText).text(`${c.count || 0} (${c.percentage || 0}%)`, col1X + 115, catY, { width: 55, align: 'right' });
      catY += 12;
    });

    // Col 2: Status summary rows
    let statY = currentY;
    const totalCRs = (statusBreakdown || []).reduce((sum, s) => sum + (s.count || 0), 0);
    (statusBreakdown || []).forEach((s) => {
      const pct = totalCRs > 0 ? Math.round(((s.count || 0) / totalCRs) * 100) : 0;
      doc.fontSize(7.5).fillColor(darkText).text(s.label || s.status || '', col2X, statY, { width: 105 });
      doc.fontSize(7.5).fillColor(mutedText).text(`${s.count || 0} (${pct}%)`, col2X + 110, statY, { width: 55, align: 'right' });
      statY += 12;
    });

    // Col 3: Location summary rows
    let locY = currentY;
    locationStats.slice(0, 6).forEach((l) => {
      doc.fontSize(7.5).fillColor(darkText).text(l.location, col3X, locY, { width: 110, ellipsis: true });
      doc.fontSize(7.5).fillColor(mutedText).text(`${l.count} (${l.percentage}%)`, col3X + 115, locY, { width: 54, align: 'right' });
      locY += 12;
    });

    currentY = Math.max(catY, statY, locY) + 12;
    doc.moveTo(36, currentY).lineTo(559, currentY).strokeColor(borderColor).lineWidth(1).stroke();
    currentY += 14;

    // Change Requests Table Header Function
    const drawTableHeader = (y) => {
      doc.rect(36, y, 523, 18).fill('#F1F5F9');
      doc.fontSize(7.2).fillColor('#334155');
      doc.text('CR ID', 38, y + 5, { width: 44 });
      doc.text('TITLE', 84, y + 5, { width: 110 });
      doc.text('CATEGORY', 196, y + 5, { width: 75 });
      doc.text('LOCATION', 273, y + 5, { width: 68 });
      doc.text('REQUESTER', 343, y + 5, { width: 72 });
      doc.text('RAISED', 417, y + 5, { width: 40 });
      doc.text('CLOSED', 459, y + 5, { width: 40 });
      doc.text('APPROVED BY', 501, y + 5, { width: 56, align: 'right' });
      doc.moveTo(36, y + 18).lineTo(559, y + 18).strokeColor(borderColor).lineWidth(0.5).stroke();
    };

    doc.fontSize(11).fillColor(darkText).text(`Change Requests (${changeRequests.length})`, 36, currentY);
    currentY += 16;
    drawTableHeader(currentY);
    currentY += 19;

    // Table rows
    changeRequests.forEach((cr, index) => {
      if (currentY > 780) {
        doc.addPage();
        currentY = 36;
        drawTableHeader(currentY);
        currentY += 19;
      }

      if (index % 2 === 1) {
        doc.rect(36, currentY - 1, 523, 15).fill(zebraBg);
      }

      const reqEmail = cr.employeeEmail || cr.requesterEmail || '';
      const reqName = cr.employeeName || cr.requester || cr.requesterName || (reqEmail ? reqEmail.split('@')[0] : '—');
      const approverName = cr.status === 'Rejected'
        ? (cr.rejectedBy || cr.decidedBy || '—')
        : (cr.approvedBy || cr.decidedBy || (['Approved', 'Implemented'].includes(cr.status) ? 'Approver' : '—'));

      doc.fontSize(7.2).fillColor(primaryColor).text(cr.id || '', 38, currentY, { width: 44 });
      doc.fontSize(7.2).fillColor(darkText).text((cr.title || '').substring(0, 28), 84, currentY, { width: 110, height: 12, ellipsis: true });
      doc.fontSize(7.2).fillColor(darkText).text((cr.category || '').substring(0, 18), 196, currentY, { width: 75, height: 12, ellipsis: true });
      doc.fontSize(7.2).fillColor(mutedText).text((cr.location || 'Unspecified').substring(0, 16), 273, currentY, { width: 68, height: 12, ellipsis: true });
      doc.fontSize(7.2).fillColor(darkText).text(reqName.substring(0, 16), 343, currentY, { width: 72, height: 12, ellipsis: true });
      doc.fontSize(7.2).fillColor(mutedText).text((cr.raisedDate || cr.submittedAt || '—').substring(0, 12), 417, currentY, { width: 40, height: 12 });
      doc.fontSize(7.2).fillColor(mutedText).text((cr.closedDate || '—').substring(0, 12), 459, currentY, { width: 40, height: 12 });

      const approverColor = cr.status === 'Rejected' ? '#DC2626' : cr.status === 'Approved' ? '#059669' : '#334155';
      doc.fontSize(7.2).fillColor(approverColor).text(approverName.substring(0, 14), 501, currentY, { width: 56, align: 'right', ellipsis: true });

      currentY += 15;
    });

    // Footers on all buffered pages
    const pageRange = doc.bufferedPageRange();
    for (let i = 0; i < pageRange.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(7.5).fillColor('#94A3B8').text(
        `Page ${i + 1} of ${pageRange.count}   •   SFC Change Desk   •   Internal & Confidential`,
        36,
        812,
        { align: 'center', width: 523 }
      );
    }

    doc.end();
    return;
  }

  res.status(400).json({ success: false, message: `Unsupported format: ${format}. Supported formats are csv and pdf.` });
});
