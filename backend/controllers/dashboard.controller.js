import PDFDocument from 'pdfkit';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  getMetricsService,
  getCategoryMetricsService,
  getStatusBreakdownService,
  getFilteredChangeRequests
} from '../services/dashboard.service.js';
import { getPreSpendRequestsService } from '../services/preSpend.service.js';
import { getTravelRequestsService } from '../services/travelDesk.service.js';

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
  const moduleType = (req.query?.module || req.body?.module || 'change_request').toLowerCase();
  const { dateFilter, startDate, endDate, status } = req.query;
  const searchQuery = req.query.search || req.query.searchQuery || null;
  const dateStamp = new Date().toISOString().slice(0, 10);

  // ──────────────────────────────────────────────────────────
  // A. PRE-SPEND EXPORT
  // ──────────────────────────────────────────────────────────
  if (moduleType === 'prespend') {
    const psResult = await getPreSpendRequestsService({
      user: null,
      userId: null,
      isWorklist: false,
      isOrgWorklist: true,
      status: status && status !== 'All' ? status : null,
      searchQuery,
      page: 1,
      limit: 10000
    });

    const requests = psResult?.data || [];
    const statusCounts = psResult?.statusCounts || { All: 0, Pending: 0, Approved: 0, Rejected: 0 };
    const categoryCounts = psResult?.categoryCounts || {};

    if (format === 'csv' || format === 'excel' || format === 'xlsx') {
      const lines = [];
      lines.push('ORGANIZATION PRE-SPEND REPORT');
      lines.push(`"Generated At","${new Date().toLocaleString()}"`);
      lines.push(`"Date Filter","${dateFilter || 'overall'}${dateFilter === 'custom' ? ` (${startDate} to ${endDate})` : ''}"`);
      lines.push(`"Status Filter","${status || 'All'}"`);
      if (searchQuery) lines.push(`"Search Query","${String(searchQuery).replace(/"/g, '""')}"`);
      lines.push('');

      // Summary Metrics
      lines.push('--- SUMMARY METRICS ---');
      lines.push('"Total Requests","Pending Review","Approved Spend","Processed / Paid","Rejected"');
      lines.push(`${statusCounts.All || requests.length},${statusCounts.Pending || 0},${statusCounts.Approved || 0},${statusCounts.Implemented || 0},${statusCounts.Rejected || 0}`);
      lines.push('');

      // Spend by Category
      lines.push('--- SPEND BY CATEGORY ---');
      lines.push('"Category","Request Count"');
      Object.entries(categoryCounts).forEach(([cat, count]) => {
        lines.push(`"${cat.replace(/"/g, '""')}",${count}`);
      });
      lines.push('');

      // Pre-Spend Requests Table
      lines.push('--- PRE-SPEND REQUESTS ---');
      lines.push('"PS ID","Item Description","Category","Subcategory","Estimated Amount (INR)","Cost Centre","Budget Line","Requester Name","Requester Email","Needed By Date","Selected Vendor","Commercial Exception","Status","Approved By"');
      requests.forEach((r) => {
        lines.push([
          `"${(r.requestCode || r.id || '').replace(/"/g, '""')}"`,
          `"${(r.itemDescription || '').replace(/"/g, '""')}"`,
          `"${(r.category || '').replace(/"/g, '""')}"`,
          `"${(r.subcategory || '').replace(/"/g, '""')}"`,
          Number(r.estimatedAmount || 0),
          `"${(r.costCentre || '').replace(/"/g, '""')}"`,
          `"${(r.budgetLine || '').replace(/"/g, '""')}"`,
          `"${(r.requesterName || '').replace(/"/g, '""')}"`,
          `"${(r.requesterEmail || '').replace(/"/g, '""')}"`,
          `"${(r.neededByDate ? new Date(r.neededByDate).toLocaleDateString('en-GB') : '—').replace(/"/g, '""')}"`,
          `"${(r.selectedVendor || '').replace(/"/g, '""')}"`,
          `"${(r.commercialException || 'None').replace(/"/g, '""')}"`,
          `"${(r.status || 'Pending').replace(/"/g, '""')}"`,
          `"${(r.decidedBy || r.approvedBy || (r.status === 'Approved' ? 'Approver' : '—')).replace(/"/g, '""')}"`
        ].join(','));
      });

      const csvContent = '\uFEFF' + lines.join('\r\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="prespend_organization_dashboard_${dateStamp}.csv"`);
      return res.send(csvContent);
    }

    if (format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="prespend_organization_dashboard_${dateStamp}.pdf"`);

      const PDFDoc = PDFDocument.default || PDFDocument;
      const doc = new PDFDoc({ margin: 36, size: 'A4', bufferPages: true });
      doc.pipe(res);

      doc.fontSize(10).fillColor('#1E3A8A').text('SFC CHANGE DESK', 36, 36, { characterSpacing: 1.5 });
      doc.fontSize(18).fillColor('#0F172A').text('Organization Pre-Spend Report', 36, 50);
      doc.fontSize(8.5).fillColor('#64748B').text(
        `Generated on ${new Date().toLocaleString()}  |  Scope: Organization  |  Total Requests: ${requests.length}`,
        36,
        72
      );
      doc.moveTo(36, 92).lineTo(559, 92).strokeColor('#E2E8F0').lineWidth(1).stroke();

      let currentY = 105;
      doc.fontSize(10).fillColor('#0F172A').text(`Pre-Spend Requests (${requests.length})`, 36, currentY);
      currentY += 16;

      const drawPSHeader = (y) => {
        doc.rect(36, y, 523, 18).fill('#F1F5F9');
        doc.fontSize(7.2).fillColor('#334155');
        doc.text('PS ID', 38, y + 5, { width: 55 });
        doc.text('DESCRIPTION', 96, y + 5, { width: 120 });
        doc.text('CATEGORY', 218, y + 5, { width: 75 });
        doc.text('AMOUNT (INR)', 295, y + 5, { width: 65 });
        doc.text('REQUESTER', 362, y + 5, { width: 75 });
        doc.text('STATUS', 439, y + 5, { width: 60 });
        doc.text('APPROVED BY', 501, y + 5, { width: 56, align: 'right' });
        doc.moveTo(36, y + 18).lineTo(559, y + 18).strokeColor('#E2E8F0').lineWidth(0.5).stroke();
      };

      drawPSHeader(currentY);
      currentY += 19;

      requests.forEach((r, idx) => {
        if (currentY > 780) {
          doc.addPage();
          currentY = 36;
          drawPSHeader(currentY);
          currentY += 19;
        }
        if (idx % 2 === 1) doc.rect(36, currentY - 1, 523, 15).fill('#F8FAFC');

        const approver = r.decidedBy || r.approvedBy || (r.status === 'Approved' ? 'Approver' : '—');
        doc.fontSize(7.2).fillColor('#1E3A8A').text(r.requestCode || r.id || '', 38, currentY, { width: 55 });
        doc.fontSize(7.2).fillColor('#0F172A').text((r.itemDescription || '').substring(0, 30), 96, currentY, { width: 120, ellipsis: true });
        doc.fontSize(7.2).fillColor('#0F172A').text((r.category || '').substring(0, 18), 218, currentY, { width: 75, ellipsis: true });
        doc.fontSize(7.2).fillColor('#059669').text(`INR ${Number(r.estimatedAmount || 0).toLocaleString('en-IN')}`, 295, currentY, { width: 65 });
        doc.fontSize(7.2).fillColor('#0F172A').text((r.requesterName || '').substring(0, 16), 362, currentY, { width: 75, ellipsis: true });
        doc.fontSize(7.2).fillColor('#D97706').text(r.status || 'Pending', 439, currentY, { width: 60 });
        doc.fontSize(7.2).fillColor('#334155').text(approver.substring(0, 14), 501, currentY, { width: 56, align: 'right', ellipsis: true });
        currentY += 15;
      });

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
  }

  // ──────────────────────────────────────────────────────────
  // B. TRAVEL DESK EXPORT
  // ──────────────────────────────────────────────────────────
  if (moduleType === 'travel') {
    const travelResult = await getTravelRequestsService({
      user: null,
      userId: null,
      isWorklist: false,
      isOrgWorklist: true,
      status: status && status !== 'All' ? status : null,
      searchQuery,
      page: 1,
      limit: 10000
    });

    const requests = travelResult?.data || [];
    const statusCounts = travelResult?.statusCounts || { All: 0, Pending: 0, Approved: 0, Rejected: 0 };
    const modeCounts = travelResult?.modeCounts || {};

    if (format === 'csv' || format === 'excel' || format === 'xlsx') {
      const lines = [];
      lines.push('ORGANIZATION TRAVEL DESK REPORT');
      lines.push(`"Generated At","${new Date().toLocaleString()}"`);
      lines.push(`"Date Filter","${dateFilter || 'overall'}${dateFilter === 'custom' ? ` (${startDate} to ${endDate})` : ''}"`);
      lines.push(`"Status Filter","${status || 'All'}"`);
      if (searchQuery) lines.push(`"Search Query","${String(searchQuery).replace(/"/g, '""')}"`);
      lines.push('');

      // Summary Metrics
      lines.push('--- SUMMARY METRICS ---');
      lines.push('"Total Bookings","Pending Approvals","Ticketed & Confirmed","Completed","Rejected"');
      lines.push(`${statusCounts.All || requests.length},${statusCounts.Pending || 0},${statusCounts.Approved || 0},${statusCounts.Implemented || 0},${statusCounts.Rejected || 0}`);
      lines.push('');

      // Travel by Mode
      lines.push('--- TRAVEL BY MODE ---');
      lines.push('"Mode","Booking Count"');
      Object.entries(modeCounts).forEach(([mode, count]) => {
        lines.push(`"${mode.replace(/"/g, '""')}",${count}`);
      });
      lines.push('');

      // Travel Requests Table
      lines.push('--- TRAVEL RESERVATIONS ---');
      lines.push('"TR ID","Title / Description","Travel Mode","Origin","Destination","Travel Date","Return Date","Traveller Name","Traveller Email","Department","Purpose","Short Notice","Status","Approved By"');
      requests.forEach((r) => {
        lines.push([
          `"${(r.requestCode || r.id || '').replace(/"/g, '""')}"`,
          `"${(r.title || '').replace(/"/g, '""')}"`,
          `"${(r.travelMode || 'Flight').replace(/"/g, '""')}"`,
          `"${(r.fromLocation || '').replace(/"/g, '""')}"`,
          `"${(r.toLocation || '').replace(/"/g, '""')}"`,
          `"${(r.departureDate ? new Date(r.departureDate).toLocaleDateString('en-GB') : '—').replace(/"/g, '""')}"`,
          `"${(r.returnDate ? new Date(r.returnDate).toLocaleDateString('en-GB') : '—').replace(/"/g, '""')}"`,
          `"${(r.travellerName || '').replace(/"/g, '""')}"`,
          `"${(r.travellerEmail || '').replace(/"/g, '""')}"`,
          `"${(r.department || '').replace(/"/g, '""')}"`,
          `"${(r.purpose || '').replace(/"/g, '""')}"`,
          r.isShortNotice ? '"Yes (< 7 days)"' : '"No"',
          `"${(r.status || 'Pending').replace(/"/g, '""')}"`,
          `"${(r.decidedBy || r.approvedBy || (r.status === 'Approved' ? 'Approver' : '—')).replace(/"/g, '""')}"`
        ].join(','));
      });

      const csvContent = '\uFEFF' + lines.join('\r\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="travel_organization_dashboard_${dateStamp}.csv"`);
      return res.send(csvContent);
    }

    if (format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="travel_organization_dashboard_${dateStamp}.pdf"`);

      const PDFDoc = PDFDocument.default || PDFDocument;
      const doc = new PDFDoc({ margin: 36, size: 'A4', bufferPages: true });
      doc.pipe(res);

      doc.fontSize(10).fillColor('#1E3A8A').text('SFC CHANGE DESK', 36, 36, { characterSpacing: 1.5 });
      doc.fontSize(18).fillColor('#0F172A').text('Organization Travel Desk Report', 36, 50);
      doc.fontSize(8.5).fillColor('#64748B').text(
        `Generated on ${new Date().toLocaleString()}  |  Scope: Organization  |  Total Requests: ${requests.length}`,
        36,
        72
      );
      doc.moveTo(36, 92).lineTo(559, 92).strokeColor('#E2E8F0').lineWidth(1).stroke();

      let currentY = 105;
      doc.fontSize(10).fillColor('#0F172A').text(`Travel Bookings (${requests.length})`, 36, currentY);
      currentY += 16;

      const drawTravelHeader = (y) => {
        doc.rect(36, y, 523, 18).fill('#F1F5F9');
        doc.fontSize(7.2).fillColor('#334155');
        doc.text('TR ID', 38, y + 5, { width: 55 });
        doc.text('MODE', 96, y + 5, { width: 55 });
        doc.text('ROUTE', 153, y + 5, { width: 120 });
        doc.text('TRAVEL DATE', 275, y + 5, { width: 65 });
        doc.text('TRAVELLER', 342, y + 5, { width: 85 });
        doc.text('STATUS', 430, y + 5, { width: 65 });
        doc.text('APPROVED BY', 501, y + 5, { width: 56, align: 'right' });
        doc.moveTo(36, y + 18).lineTo(559, y + 18).strokeColor('#E2E8F0').lineWidth(0.5).stroke();
      };

      drawTravelHeader(currentY);
      currentY += 19;

      requests.forEach((r, idx) => {
        if (currentY > 780) {
          doc.addPage();
          currentY = 36;
          drawTravelHeader(currentY);
          currentY += 19;
        }
        if (idx % 2 === 1) doc.rect(36, currentY - 1, 523, 15).fill('#F8FAFC');

        const approver = r.decidedBy || r.approvedBy || (r.status === 'Approved' ? 'Approver' : '—');
        const route = `${r.fromLocation || '—'} -> ${r.toLocation || '—'}`;
        const travelDate = r.departureDate ? new Date(r.departureDate).toLocaleDateString('en-GB') : '—';

        doc.fontSize(7.2).fillColor('#1E3A8A').text(r.requestCode || r.id || '', 38, currentY, { width: 55 });
        doc.fontSize(7.2).fillColor('#0F172A').text(r.travelMode || 'Flight', 96, currentY, { width: 55 });
        doc.fontSize(7.2).fillColor('#0F172A').text(route.substring(0, 26), 153, currentY, { width: 120, ellipsis: true });
        doc.fontSize(7.2).fillColor('#64748B').text(travelDate, 275, currentY, { width: 65 });
        doc.fontSize(7.2).fillColor('#0F172A').text((r.travellerName || '').substring(0, 18), 342, currentY, { width: 85, ellipsis: true });
        doc.fontSize(7.2).fillColor(r.isShortNotice ? '#DC2626' : '#D97706').text(r.status || 'Pending', 430, currentY, { width: 65 });
        doc.fontSize(7.2).fillColor('#334155').text(approver.substring(0, 14), 501, currentY, { width: 56, align: 'right', ellipsis: true });
        currentY += 15;
      });

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
  }

  // ──────────────────────────────────────────────────────────
  // C. CHANGE REQUEST EXPORT (DEFAULT)
  // ──────────────────────────────────────────────────────────
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
    res.setHeader('Content-Disposition', `attachment; filename="changedesk_organization_dashboard_${dateStamp}.csv"`);
    return res.send(csvContent);
  }

  // 3. PDF Generation
  if (format === 'pdf') {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="changedesk_organization_dashboard_${dateStamp}.pdf"`);

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
