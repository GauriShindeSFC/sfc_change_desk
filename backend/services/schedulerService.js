import { Op } from 'sequelize';
import PDFDocument from 'pdfkit';
import { ScheduledReport } from '../models/index.js';
import { sendMail } from './mailService.js';
import {
  getSuccessRateSummary,
  getCategoryVolume,
  getApprovalTurnaroundTime,
  getEmergencyChangeLog,
  getAuditTrailExport
} from './reportContentService.js';

/**
 * Phase 5: Compute initial nextRunAt based on frequency upon schedule creation.
 */
export const computeInitialNextRunAt = (frequency, customToDate = null) => {
  const now = new Date();
  const next = new Date(now);

  if (frequency === 'daily') {
    next.setDate(next.getDate() + 1);
    next.setHours(9, 0, 0, 0);
  } else if (frequency === 'weekly') {
    // Next Monday at 9:00 AM
    const day = next.getDay();
    const daysUntilMonday = (8 - day) % 7 || 7;
    next.setDate(next.getDate() + daysUntilMonday);
    next.setHours(9, 0, 0, 0);
  } else if (frequency === 'monthly') {
    // 1st of next month at 9:00 AM
    next.setMonth(next.getMonth() + 1);
    next.setDate(1);
    next.setHours(9, 0, 0, 0);
  } else if (frequency === 'one_time') {
    if (customToDate) {
      return new Date(customToDate);
    }
    // Default to 1 hour from creation time for one_time if not specified
    next.setHours(next.getHours() + 1);
  }

  return next;
};

/**
 * Compute next run date after an execution run.
 */

export const computeNextRunAfterRun = (frequency, currentNextRunAt = new Date()) => {
  const next = new Date(currentNextRunAt || Date.now());

  if (frequency === 'daily') {
    next.setDate(next.getDate() + 1);
  } else if (frequency === 'weekly') {
    next.setDate(next.getDate() + 7);
  } else if (frequency === 'monthly') {
    next.setMonth(next.getMonth() + 1);
  }

  return next;
};

/**
 * Phase 4 Step 1: Compute rolling date range relative to right now.
 */
export const computeRollingDateRange = (frequency) => {
  const toDate = new Date();
  const fromDate = new Date(toDate);

  if (frequency === 'daily') {
    fromDate.setDate(fromDate.getDate() - 1);
  } else if (frequency === 'weekly') {
    fromDate.setDate(fromDate.getDate() - 7);
  } else if (frequency === 'monthly') {
    fromDate.setMonth(fromDate.getMonth() - 1);
  } else {
    // one_time fallback rolling window (last 7 days)
    fromDate.setDate(fromDate.getDate() - 7);
  }

  return { fromDate, toDate };
};

/**
 * Generate PDF buffer for report content
 */
const generateReportPDFBuffer = async (reportType, content, schedule) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const buffers = [];

    doc.on('data', b => buffers.push(b));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', err => reject(err));

    doc.fontSize(18).fillColor('#0F172A').text(`Scheduled Report: ${schedule.reportType}`, { align: 'left' });
    doc.fontSize(9).fillColor('#64748B').text(`Frequency: ${schedule.frequency}  |  Generated on ${new Date().toLocaleString()}`, { align: 'left' });
    doc.moveDown(1.5);

    if (reportType === 'success_rate') {
      doc.fontSize(12).fillColor('#1E293B').text(`Approved Tickets: ${content.approved}`);
      doc.fontSize(12).fillColor('#1E293B').text(`Rejected Tickets: ${content.rejected}`);
      doc.fontSize(12).fillColor('#1E293B').text(`Total Evaluated: ${content.total}`);
      doc.fontSize(14).fillColor('#059669').text(`Success Rate: ${content.successRate}%`);
    } else if (reportType === 'category_volume') {
      doc.fontSize(12).fillColor('#1E293B').text(`Total Volume Evaluated: ${content.totalTickets} tickets`);
      doc.moveDown(0.5);
      content.breakdown.forEach(item => {
        doc.fontSize(10).fillColor('#334155').text(`${item.name}: ${item.count} tickets (${item.percentage}%)`);
      });
    } else if (reportType === 'turnaround_time') {
      doc.fontSize(12).fillColor('#1E293B').text(`Total Resolved Tickets Analyzed: ${content.ticketCount}`);
      doc.fontSize(14).fillColor('#0284C7').text(`Average Turnaround Time: ${content.avgTurnaroundDays} days (${content.avgTurnaroundHours} hours)`);
    } else if (reportType === 'emergency_log') {
      doc.fontSize(12).fillColor('#DC2626').text(`Emergency Changes Count: ${content.totalEmergencyCount}`);
      doc.moveDown(0.5);
      content.tickets.forEach((t, i) => {
        doc.fontSize(9).fillColor('#1E293B').text(`${i + 1}. ${t.id} - ${t.title} [Status: ${t.status}] (Requester: ${t.requesterName})`);
      });
    } else if (reportType === 'audit_trail') {
      doc.fontSize(12).fillColor('#1E293B').text(`Total Audit Log Entries: ${content.totalLogs}`);
      doc.moveDown(0.5);
      content.logs.slice(0, 50).forEach((l, i) => {
        doc.fontSize(8.5).fillColor('#334155').text(`${l.timestamp} | ${l.actorName} | ${l.action} | Ref: ${l.ref}`);
      });
    }

    doc.end();
  });
};

/**
 * Generate CSV text for report content
 */
const generateReportCSVBuffer = (reportType, content) => {
  let csv = '';
  if (reportType === 'success_rate') {
    csv = `Approved,Rejected,Total,SuccessRate\n${content.approved},${content.rejected},${content.total},${content.successRate}%\n`;
  } else if (reportType === 'category_volume') {
    csv = `Category,TicketCount,Percentage\n` + content.breakdown.map(b => `"${b.name}",${b.count},${b.percentage}%`).join('\n');
  } else if (reportType === 'turnaround_time') {
    csv = `EvaluatedTickets,AvgTurnaroundDays,AvgTurnaroundHours\n${content.ticketCount},${content.avgTurnaroundDays},${content.avgTurnaroundHours}\n`;
  } else if (reportType === 'emergency_log') {
    csv = `ID,Title,Status,Requester,SubmittedAt,ClosedAt\n` + content.tickets.map(t => `"${t.id}","${t.title}","${t.status}","${t.requesterName}","${t.submittedAt || ''}","${t.closedAt || ''}"`).join('\n');
  } else if (reportType === 'audit_trail') {
    csv = `ID,Timestamp,Actor,Action,Reference,Detail\n` + content.logs.map(l => `"${l.id}","${l.timestamp}","${l.actorName}","${l.action}","${l.ref}","${(l.detail || '').replace(/"/g, '""')}"`).join('\n');
  }
  return Buffer.from(csv, 'utf-8');
};

/**
 * Phase 4: Run a single scheduled report
 */
export const runScheduledReport = async (schedule) => {
  console.log(`[scheduler] Running scheduled report #${schedule.id} (${schedule.reportType}, format: ${schedule.format})...`);

  // Step 1: Compute fromDate / toDate
  let fromDate = null;
  let toDate = null;

  if (schedule.dateRangeMode === 'custom') {
    fromDate = schedule.customFromDate;
    toDate = schedule.customToDate;
  } else {
    const range = computeRollingDateRange(schedule.frequency);
    fromDate = range.fromDate;
    toDate = range.toDate;
  }

  // Step 2: Fetch Phase 2 content
  let content = null;
  const { reportType, categoryId, subcategoryId } = schedule;

  if (reportType === 'success_rate') {
    content = await getSuccessRateSummary(fromDate, toDate, categoryId, subcategoryId);
  } else if (reportType === 'category_volume') {
    content = await getCategoryVolume(fromDate, toDate, categoryId, subcategoryId);
  } else if (reportType === 'turnaround_time') {
    content = await getApprovalTurnaroundTime(fromDate, toDate, categoryId, subcategoryId);
  } else if (reportType === 'emergency_log') {
    content = await getEmergencyChangeLog(fromDate, toDate);
  } else if (reportType === 'audit_trail') {
    content = await getAuditTrailExport(fromDate, toDate);
  }

  // Step 3: Handle format (Excel task check)
  const format = (schedule.format || 'pdf').toLowerCase();
  if (format === 'excel') {
    console.error(`[scheduler] Excel export for scheduled report #${schedule.id} is not yet supported. Skipping execution run.`);
    return;
  }

  let fileBuffer = null;
  let filename = `report_${schedule.reportType}_${Date.now()}`;
  let mimeType = 'application/pdf';

  if (format === 'pdf') {
    fileBuffer = await generateReportPDFBuffer(reportType, content, schedule);
    filename += '.pdf';
    mimeType = 'application/pdf';
  } else if (format === 'csv') {
    fileBuffer = generateReportCSVBuffer(reportType, content);
    filename += '.csv';
    mimeType = 'text/csv';
  }

  // Step 4: Email attachment to recipients
  const subject = `Scheduled Report: ${schedule.reportType} (${schedule.frequency})`;
  const bodyText = `Attached is your scheduled report for ${schedule.reportType} (${schedule.frequency}).\n\nGenerated at: ${new Date().toLocaleString()}`;

  await sendMail({
    to: schedule.recipients,
    subject,
    text: bodyText,
    attachments: [
      {
        filename,
        content: fileBuffer,
        contentType: mimeType
      }
    ]
  });

  // Step 5: Update lastRunAt = now
  const now = new Date();
  schedule.lastRunAt = now;

  // Step 6: Compute new nextRunAt (or deactivate one_time)
  if (schedule.frequency === 'one_time') {
    schedule.isActive = false;
  } else {
    schedule.nextRunAt = computeNextRunAfterRun(schedule.frequency, schedule.nextRunAt);
  }

  await schedule.save();
  console.log(`[scheduler] Finished scheduled report #${schedule.id}. Next run: ${schedule.nextRunAt}`);
};

/**
 * Phase 4 Scheduler Entry Point (runs hourly)
 */
export const initScheduler = () => {
  console.log('[scheduler] Initializing recurring hourly report scheduler...');

  const runDueSchedules = async () => {
    try {
      const dueSchedules = await ScheduledReport.findAll({
        where: {
          isActive: true,
          nextRunAt: { [Op.lte]: new Date() }
        }
      });

      if (dueSchedules.length > 0) {
        console.log(`[scheduler] Found ${dueSchedules.length} due report schedules.`);
        for (const schedule of dueSchedules) {
          await runScheduledReport(schedule);
        }
      }
    } catch (err) {
      console.error('[scheduler] Error running scheduled reports due-check:', err.message);
    }
  };

  // Run immediate due-check on boot, then repeat every 1 hour (3,600,000 ms)
  runDueSchedules();
  setInterval(runDueSchedules, 3600000);
};
