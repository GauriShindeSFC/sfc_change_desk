// ────────────────────────────────────────────────────────────────
//  Email notifications (nodemailer / SMTP).
//
//  Config comes entirely from backend/.env:
//    MAIL_ENABLED, SMTP_HOST, SMTP_PORT, SMTP_SECURE,
//    SMTP_USER, SMTP_PASS, MAIL_FROM, MAIL_LOGO_URL, APP_BASE_URL
//
//  If mail is disabled or unconfigured, send*() no-ops (and logs)
//  so the app never fails because of email.
// ────────────────────────────────────────────────────────────────
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';

const env = process.env;

const appUrl = () => (env.APP_BASE_URL || 'http://localhost:5174').replace(/\/+$/, '');

const LOGO_CID = 'changedesk-logo';
const LOGO_FILE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'frontend',
  'public',
  'images',
  'white-stfox-logo.png'
);
const hasLocalLogo = () => {
  try {
    return fs.existsSync(LOGO_FILE);
  } catch {
    return false;
  }
};

/** { src } for the header <img>, or null to fall back to a text wordmark. */
const logoSrc = () => {
  if (env.MAIL_LOGO_URL) return env.MAIL_LOGO_URL;
  if (hasLocalLogo()) return `cid:${LOGO_CID}`;
  return null;
};

/** Attachments array to pass to every send (inline logo when embedding). */
export const mailAttachments = () =>
  !env.MAIL_LOGO_URL && hasLocalLogo()
    ? [{ filename: 'stfox-logo.png', path: LOGO_FILE, cid: LOGO_CID, contentDisposition: 'inline' }]
    : [];

let transporter = null;
let injected = false;
let etherealAccount = null;

const getTransporter = async () => {
  if (injected) return transporter;
  if (String(env.MAIL_ENABLED).toLowerCase() === 'false') return null;

  if (env.SMTP_HOST) {
    if (!transporter) {
      const secure = String(env.SMTP_SECURE).toLowerCase() === 'true';
      transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: Number(env.SMTP_PORT) || 587,
        secure,
        requireTLS: !secure,
        auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined
      });
    }
    return transporter;
  }

  // Automatic Ethereal test inbox fallback for effortless local testing
  if (!transporter) {
    try {
      console.log('[mail] No SMTP_HOST found — creating free Ethereal virtual mailbox for testing...');
      etherealAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: etherealAccount.user,
          pass: etherealAccount.pass
        }
      });
      console.log(`[mail] Ethereal virtual mailbox ready (${etherealAccount.user})`);
    } catch (err) {
      console.warn('[mail] Failed to create Ethereal test mailbox:', err.message);
      return null;
    }
  }
  return transporter;
};

/** Inject a specific transporter (used by scripts/sendTestEmail.js). */
export const setTransporter = (t) => {
  transporter = t;
  injected = Boolean(t);
};

const asList = (v) =>
  (Array.isArray(v) ? v : [v])
    .flatMap((x) => (typeof x === 'string' ? x.split(',') : x))
    .map((x) => (x || '').trim())
    .filter(Boolean);

const esc = (s = '') =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// ---------- Shared branded HTML layout -----------------------

const C = {
  accent: '#0D9488',
  ink: '#10151E',
  muted: '#5B6472',
  border: '#E4E7EC',
  headerBg: '#10151E',
  pageBg: '#F1F2F4',
  footerBg: '#FAFAFB'
};

export const renderEmail = ({
  preheader = '',
  heading,
  intro = '',
  rows = [],
  bodyHtml = '',
  ctaLabel,
  ctaUrl,
  footnote
}) => {
  const rowsHtml = rows.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:14px 0 2px">
        ${rows
          .map(
            ([k, v]) => `<tr>
              <td style="padding:7px 14px 7px 0;font:400 13px/1.45 Arial,Helvetica,sans-serif;color:${C.muted};white-space:nowrap;vertical-align:top">${esc(k)}</td>
              <td style="padding:7px 0;font:700 13px/1.45 Arial,Helvetica,sans-serif;color:${C.ink}">${esc(v)}</td>
            </tr>`
          )
          .join('')}
      </table>`
    : '';

  const ctaHtml =
    ctaLabel && ctaUrl
      ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px">
          <tr><td style="border-radius:8px;background:${C.accent}">
            <a href="${esc(ctaUrl)}" style="display:inline-block;padding:12px 24px;font:700 13px Arial,Helvetica,sans-serif;color:#ffffff;text-decoration:none;border-radius:8px">${esc(ctaLabel)}</a>
          </td></tr>
        </table>
        <p style="font:400 11px/1.5 Arial,Helvetica,sans-serif;color:${C.muted};margin:0">
          Or paste this link into your browser:<br>
          <a href="${esc(ctaUrl)}" style="color:${C.accent};word-break:break-all">${esc(ctaUrl)}</a>
        </p>`
      : '';

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(heading)}</title>
</head>
<body style="margin:0;padding:0;background:${C.pageBg};-webkit-text-size-adjust:100%">
  <span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;font-size:1px;line-height:1px;color:${C.pageBg}">${esc(preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.pageBg};padding:28px 12px">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid ${C.border};border-radius:14px;overflow:hidden">
        <tr><td style="background:${C.headerBg};padding:18px 28px">
          ${
            logoSrc()
              ? `<img src="${esc(logoSrc())}" alt="ST FOX" height="30" style="height:30px;width:auto;display:block;border:0;outline:none;text-decoration:none">`
              : `<span style="font:800 20px Arial,Helvetica,sans-serif;color:#ffffff;letter-spacing:.04em">ST FOX</span>`
          }
        </td></tr>
        <tr><td style="padding:30px 28px 8px">
          <h1 style="font:800 20px/1.3 Arial,Helvetica,sans-serif;color:${C.ink};margin:0 0 10px">${esc(heading)}</h1>
          <p style="font:400 14px/1.6 Arial,Helvetica,sans-serif;color:${C.muted};margin:0">${intro}</p>
          ${rowsHtml}
          ${bodyHtml}
          ${ctaHtml}
        </td></tr>
        <tr><td style="padding:8px 28px 26px"></td></tr>
        <tr><td style="padding:16px 28px;border-top:1px solid ${C.border};background:${C.footerBg}">
          <p style="font:400 11px/1.55 Arial,Helvetica,sans-serif;color:${C.muted};margin:0">
            ${footnote || 'Automated message from <strong>ChangeDesk</strong> · IT Change Management. Please do not reply.'}
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
};

// ---------- Formatting Helpers & Custom Field Extractor -------

export const formatFieldLabel = (key = '') => {
  return String(key)
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .replace(/\bIp\b/gi, 'IP')
    .replace(/\bOs\b/gi, 'OS')
    .replace(/\bCpu\b/gi, 'CPU')
    .replace(/\bRam\b/gi, 'RAM')
    .replace(/\bKb\b/gi, 'KB')
    .replace(/\bCve\b/gi, 'CVE')
    .replace(/\bVlan\b/gi, 'VLAN')
    .replace(/\bId\b/gi, 'ID')
    .trim();
};

export const formatCleanTime = (d) => {
  try {
    const dt = d ? new Date(d) : new Date();
    return dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).toLowerCase();
  } catch {
    return '12:00:00 pm';
  }
};

export const formatCleanDate = (d) => {
  if (!d) return '—';
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return String(d);
    const day = String(dt.getDate()).padStart(2, '0');
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const year = dt.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return String(d);
  }
};

export const formatLongDate = (d) => {
  if (!d) return '—';
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return String(d);
    return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return String(d);
  }
};

const IGNORED_CUSTOM_KEYS = [
  'comments',
  'approvedComment',
  'approvedBy',
  'rejectedComment',
  'rejectedBy',
  'rejectionReason',
  'rejection_reason',
  'implementedComment',
  'implementedBy',
  'employeeName',
  'employeeEmail',
  'managerEmail',
  'employeeId',
  'location'
];

export const extractCustomFields = (cr) => {
  const fields = [];
  const raw = (cr.customFieldValues && typeof cr.customFieldValues === 'object') ? cr.customFieldValues : {};

  // If actionRequired is available, ensure it appears first
  const actionReq = raw.actionRequired || cr.actionRequired || cr.action;
  if (actionReq && typeof actionReq === 'string' && actionReq.trim()) {
    fields.push(['actionRequired', actionReq.trim()]);
  }

  for (const [k, v] of Object.entries(raw)) {
    if (k === 'actionRequired') continue;
    if (IGNORED_CUSTOM_KEYS.includes(k)) continue;
    if (v === null || v === undefined) continue;
    if (typeof v === 'string' && v.trim() === '') continue;
    if (typeof v === 'object') continue;
    fields.push([k, String(v).trim()]);
  }
  return fields;
};

// ---------- Attached Request Dossier HTML Generator -----------

export const generateChangeRequestReportHtml = ({ cr, requesterName, approveUrl, rejectUrl }) => {
  const customEntries = extractCustomFields(cr);
  const submittedTime = formatCleanTime(cr.submittedAt || cr.createdAt);
  const startDate = formatCleanDate(cr.startDate);
  const raisedDate = formatLongDate(cr.submittedAt || cr.createdAt) || cr.raisedDate || 'Today';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Change Request: ${esc(cr.id)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #F1F5F9; color: #1E293B; margin: 0; padding: 24px; }
    .container { max-width: 760px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; box-shadow: 0 4px 16px rgba(0,0,0,0.06); overflow: hidden; }
    .header { background: #0F172A; color: #FFFFFF; padding: 20px 28px; display: flex; justify-content: space-between; align-items: center; }
    .header h1 { margin: 0; font-size: 18px; font-weight: 700; letter-spacing: -0.01em; }
    .header .tag { background: #1E293B; color: #94A3B8; font-size: 11px; padding: 4px 10px; border-radius: 6px; font-weight: 600; text-transform: uppercase; }
    
    .sub-time-banner { background: #F8FAFC; padding: 10px 28px; border-bottom: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: center; font-size: 12px; }
    .sub-time-label { font-weight: 600; color: #64748B; }
    .sub-time-val { font-weight: 700; color: #0F172A; font-family: monospace; font-size: 13px; }

    .content { padding: 24px 28px; }
    .title-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; border-bottom: 1px solid #E2E8F0; padding-bottom: 18px; margin-bottom: 20px; }
    .title-row h2 { margin: 0 0 6px 0; font-size: 20px; color: #0F172A; font-weight: 700; }
    .title-row .subtitle { font-size: 13px; color: #64748B; margin: 0; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 99px; font-size: 12px; font-weight: 700; background: #FEF3C7; color: #D97706; white-space: nowrap; }
    
    /* Lifecycle */
    .lifecycle { margin: 18px 0 24px; padding: 16px 20px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; }
    .lifecycle-title { font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 14px; }
    .stepper { display: flex; align-items: center; justify-content: space-between; position: relative; }
    .step { display: flex; flex-direction: column; align-items: center; position: relative; z-index: 2; min-width: 90px; }
    .step-circle { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; }
    .step-circle.done { background: #10B981; color: #FFFFFF; }
    .step-circle.active { background: #D97706; color: #FFFFFF; }
    .step-circle.pending { background: #E2E8F0; color: #64748B; }
    .step-label { font-size: 12px; font-weight: 600; margin-top: 6px; color: #1E293B; }
    .step-date { font-size: 11px; color: #64748B; margin-top: 2px; }
    .connector { position: absolute; top: 15px; left: 16%; right: 16%; height: 2px; background: #E2E8F0; z-index: 1; }

    /* Sections */
    .section-header { font-size: 13px; font-weight: 700; color: #0F172A; margin: 20px 0 12px; }
    .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 16px; }
    .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin-bottom: 16px; }
    .field-box { }
    .field-lbl { font-size: 11px; font-weight: 600; color: #64748B; margin-bottom: 4px; }
    .field-val { font-size: 13px; font-weight: 600; color: #0F172A; word-break: break-word; }
    .divider { height: 1px; background: #E2E8F0; margin: 18px 0; }

    /* Action & Specification Details Card */
    .spec-card { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 16px 20px; margin: 16px 0; }
    .spec-card-title { font-size: 11px; font-weight: 800; color: #0F172A; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 14px; }
    .spec-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; }

    /* Action Banner */
    .actions-box { margin-top: 28px; padding: 20px; background: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 10px; text-align: center; }
    .actions-box h3 { margin: 0 0 6px; font-size: 15px; color: #0F172A; font-weight: 700; }
    .actions-box p { margin: 0 0 16px; font-size: 12px; color: #64748B; }
    .btn-group { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }
    .btn { display: inline-block; padding: 11px 26px; border-radius: 8px; font-size: 13px; font-weight: 700; text-decoration: none; cursor: pointer; }
    .btn-approve { background: #059669; color: #FFFFFF; box-shadow: 0 2px 4px rgba(5,150,105,0.25); }
    .btn-reject { background: #DC2626; color: #FFFFFF; box-shadow: 0 2px 4px rgba(220,38,38,0.25); }
    
    .footer { padding: 14px 28px; background: #F8FAFC; border-top: 1px solid #E2E8F0; text-align: center; font-size: 11px; color: #94A3B8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>ST FOX ChangeDesk</h1>
      <span class="tag">Confidential · Request Dossier</span>
    </div>

    <!-- Form Submitted Time Banner -->
    <div class="sub-time-banner">
      <span class="sub-time-label">Form Submitted Time:</span>
      <span class="sub-time-val">${esc(submittedTime)}</span>
    </div>

    <div class="content">
      <!-- Title & Status -->
      <div class="title-row">
        <div>
          <h2>${esc(cr.id)}: ${esc(cr.title)}</h2>
          <p class="subtitle">${esc(cr.category)} · ${esc(cr.subCategory || 'Standard')}</p>
        </div>
        <span class="status-badge">● Pending</span>
      </div>

      <!-- Lifecycle Progress Tracker -->
      <div class="lifecycle">
        <div class="lifecycle-title">Lifecycle Progress</div>
        <div class="stepper">
          <div class="connector"></div>
          <div class="step">
            <div class="step-circle done">✓</div>
            <span class="step-label">1. Requested</span>
            <span class="step-date">${esc(raisedDate)}</span>
          </div>
          <div class="step">
            <div class="step-circle active">2</div>
            <span class="step-label">2. Change Manager</span>
            <span class="step-date" style="color: #D97706; font-weight: 600;">Pending Action</span>
          </div>
          <div class="step">
            <div class="step-circle pending">3</div>
            <span class="step-label">3. Implementation</span>
            <span class="step-date">Awaiting approval</span>
          </div>
        </div>
      </div>

      <!-- Section 1: Requester Details -->
      <div class="section-header">Section 1: Requester Details</div>
      <div class="grid-3">
        <div class="field-box">
          <div class="field-lbl">Requester / Employee</div>
          <div class="field-val">${esc(cr.employeeName || cr.requester || requesterName || 'Requester')}</div>
        </div>
        <div class="field-box">
          <div class="field-lbl">Approver</div>
          <div class="field-val">${esc(cr.decidedBy || cr.approver || '—')}</div>
        </div>
        <div class="field-box">
          <div class="field-lbl">Employee ID</div>
          <div class="field-val" style="font-family: monospace;">${esc(cr.employeeId || cr.empId || 'N/A')}</div>
        </div>
        <div class="field-box">
          <div class="field-lbl">Employee Email</div>
          <div class="field-val">${esc(cr.employeeEmail || cr.requesterEmail || '—')}</div>
        </div>
        <div class="field-box">
          <div class="field-lbl">Location</div>
          <div class="field-val">${esc(cr.location || 'Not specified')}</div>
        </div>
        <div class="field-box">
          <div class="field-lbl">Manager Email</div>
          <div class="field-val">${esc(cr.managerEmail || '—')}</div>
        </div>
      </div>

      <div class="divider"></div>

      <!-- Section 2: Change Details -->
      <div class="section-header">Section 2: Change Details</div>
      <div class="grid-2">
        <div class="field-box" style="grid-column: 1 / -1;">
          <div class="field-lbl">Change Title</div>
          <div class="field-val" style="font-size: 14px;">${esc(cr.title || 'Untitled Request')}</div>
        </div>
        <div class="field-box">
          <div class="field-lbl">Category</div>
          <div class="field-val">${esc(cr.category || '—')}</div>
        </div>
        <div class="field-box">
          <div class="field-lbl">Sub-category</div>
          <div class="field-val">${esc(cr.subCategory || 'Standard')}</div>
        </div>
        <div class="field-box">
          <div class="field-lbl">Start Date</div>
          <div class="field-val" style="font-family: monospace;">${esc(startDate)}</div>
        </div>
      </div>

      <!-- Action & Specification Details Box (Dynamic) -->
      ${customEntries.length > 0 ? `
        <div class="spec-card">
          <div class="spec-card-title">ACTION &amp; SPECIFICATION DETAILS</div>
          <div class="spec-grid">
            ${customEntries.map(([k, v]) => `
              <div class="field-box">
                <div class="field-lbl">${esc(formatFieldLabel(k))}</div>
                <div class="field-val">${esc(v)}</div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Raised Date & Justification -->
      <div style="margin-top: 14px;">
        <div class="field-box" style="margin-bottom: 12px;">
          <div class="field-lbl" style="font-weight: 700; color: #0F172A;">Raised Date</div>
          <div class="field-val" style="color: #64748B;">${esc(raisedDate)}</div>
        </div>

        <div class="field-box">
          <div class="field-lbl" style="font-weight: 700; color: #0F172A;">Business Justification</div>
          <div class="field-val" style="background: #F8FAFC; border: 1px solid #E2E8F0; padding: 10px 14px; border-radius: 8px; font-weight: 500; line-height: 1.5; margin-top: 4px;">
            ${esc(cr.justification || 'No justification entered.')}
          </div>
        </div>
      </div>

      <!-- Action Box -->
      <div class="actions-box">
        <h3>Change Manager Action Required</h3>
        <p>Review the details above. Click either button below to record your decision:</p>
        <div class="btn-group">
          <a href="${approveUrl}" class="btn btn-approve">✓ Approve Change Request</a>
          <a href="${rejectUrl}" class="btn btn-reject">✕ Reject Change Request</a>
        </div>
      </div>
    </div>

    <div class="footer">
      Automated request dossier generated by ChangeDesk · IT Change Management System
    </div>
  </div>
</body>
</html>`;
};

// ---------- Low-level send ---------------------------------

/** Never throws — returns a small status object. */
export const sendMail = async ({ to, cc, subject, text, html, attachments }) => {
  const toList = asList(to);
  const ccList = asList(cc).filter((a) => !toList.includes(a));
  const all = [...new Set([...toList, ...ccList])];

  const t = await getTransporter();
  if (!t) {
    console.log(`[mail] disabled — would send "${subject}" to ${all.join(', ') || '(nobody)'}`);
    return { skipped: 'mail-disabled', recipients: all };
  }
  if (all.length === 0) {
    console.log(`[mail] no recipients for "${subject}" — skipped`);
    return { skipped: 'no-recipients' };
  }

  try {
    const fromAddr = env.MAIL_FROM || (etherealAccount ? `"ChangeDesk" <${etherealAccount.user}>` : (env.SMTP_USER || 'notifications@changedesk.local'));
    const info = await t.sendMail({
      from: fromAddr,
      to: toList.length ? toList : ccList,
      cc: toList.length ? ccList : undefined,
      subject,
      text,
      html,
      attachments: attachments && attachments.length ? attachments : undefined
    });
    const preview = nodemailer.getTestMessageUrl?.(info);
    console.log(`\n======================================================`);
    console.log(`[mail] SENT: "${subject}" to ${all.join(', ')} (id ${info.messageId})`);
    if (preview) {
      console.log(`[mail] ✉️  PREVIEW EMAIL LINK: ${preview}`);
    }
    console.log(`======================================================\n`);
    return { sent: true, messageId: info.messageId, previewUrl: preview || null };
  } catch (err) {
    console.error(`[mail] FAILED "${subject}": ${err.message}`);
    return { error: err.message };
  }
};

/** Verify the SMTP connection at boot (best-effort, logs only). */
export const verifyMailTransport = async () => {
  const t = await getTransporter();
  if (!t) {
    console.log('[mail] notifications are OFF');
    return;
  }
  try {
    await t.verify();
    console.log('[mail] SMTP transport ready');
  } catch (err) {
    console.error('[mail] SMTP verify failed:', err.message);
  }
};

// ---------- Templated emails ------------------------------

/** New change request submitted → notify Change Manager approvers (+ manager as CC). */
export const sendChangeRequestCreatedEmail = async ({ cr, requesterName, approverEmails, managerEmail }) => {
  const to = asList(approverEmails);
  const cc = asList(managerEmail);
  const primary = to.length ? to : asList(env.MAIL_APPROVER_FALLBACK || 'approver@changedesk.local');

  const secret = process.env.JWT_SECRET || 'sfc-change-desk-secure-jwt-secret-key-2026';
  const token = jwt.sign(
    { crId: cr.id, approverEmail: primary[0] || 'approver@company.com' },
    secret,
    { expiresIn: '7d' }
  );

  const approveUrl = `${appUrl()}/approval-action?token=${encodeURIComponent(token)}&action=approve`;
  const rejectUrl = `${appUrl()}/approval-action?token=${encodeURIComponent(token)}&action=reject`;

  const customEntries = extractCustomFields(cr);
  const submittedTime = formatCleanTime(cr.submittedAt || cr.createdAt);
  const startDate = formatCleanDate(cr.startDate);
  const raisedDate = formatLongDate(cr.submittedAt || cr.createdAt) || cr.raisedDate || 'Today';
  const reqName = cr.employeeName || cr.requester || requesterName || 'Requester';

  const subject = `Approval Required: ${cr.title} (${cr.id})`;

  // Build the email body matching the modal layout
  const bodyHtml = `
    <!-- Form Submitted Time Bar -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;border-bottom:1px solid ${C.border};padding:10px 14px;margin-bottom:18px;border-radius:6px">
      <tr>
        <td style="font:600 12px Arial,sans-serif;color:${C.muted}">Form Submitted Time:</td>
        <td align="right" style="font:700 12px monospace;color:${C.ink}">${esc(submittedTime)}</td>
      </tr>
    </table>

    <!-- Header & Status -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px">
      <tr>
        <td>
          <span style="font:700 12px monospace;color:#2563EB">${esc(cr.id)}</span>
          <h2 style="font:700 17px Arial,sans-serif;color:${C.ink};margin:3px 0 2px">${esc(cr.title)}</h2>
          <span style="font:400 12px Arial,sans-serif;color:${C.muted}">${esc(cr.category)} · ${esc(cr.subCategory || 'Standard')}</span>
        </td>
        <td align="right" valign="top">
          <span style="display:inline-block;padding:4px 12px;border-radius:99px;font:700 11px Arial,sans-serif;background:#FEF3C7;color:#D97706">
            ● Pending
          </span>
        </td>
      </tr>
    </table>

    <!-- Section 1: Requester Details -->
    <div style="border-top:1px solid ${C.border};padding-top:14px;margin-top:14px">
      <div style="font:700 13px Arial,sans-serif;color:${C.ink};margin-bottom:10px">Section 1: Requester Details</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:14px">
        <tr>
          <td width="33%" style="padding:6px 10px 6px 0;vertical-align:top">
            <div style="font:500 11px Arial,sans-serif;color:${C.muted};margin-bottom:2px">Requester / Employee</div>
            <div style="font:600 13px Arial,sans-serif;color:${C.ink}">${esc(reqName)}</div>
          </td>
          <td width="33%" style="padding:6px 10px 6px 0;vertical-align:top">
            <div style="font:500 11px Arial,sans-serif;color:${C.muted};margin-bottom:2px">Approver</div>
            <div style="font:600 13px Arial,sans-serif;color:${C.ink}">${esc(cr.decidedBy || cr.approver || '—')}</div>
          </td>
          <td width="34%" style="padding:6px 0 6px 0;vertical-align:top">
            <div style="font:500 11px Arial,sans-serif;color:${C.muted};margin-bottom:2px">Employee ID</div>
            <div style="font:600 13px monospace;color:${C.ink}">${esc(cr.employeeId || cr.empId || 'N/A')}</div>
          </td>
        </tr>
        <tr>
          <td width="33%" style="padding:6px 10px 6px 0;vertical-align:top">
            <div style="font:500 11px Arial,sans-serif;color:${C.muted};margin-bottom:2px">Employee Email</div>
            <div style="font:600 12px Arial,sans-serif;color:${C.ink}">${esc(cr.employeeEmail || cr.requesterEmail || '—')}</div>
          </td>
          <td width="33%" style="padding:6px 10px 6px 0;vertical-align:top">
            <div style="font:500 11px Arial,sans-serif;color:${C.muted};margin-bottom:2px">Location</div>
            <div style="font:600 13px Arial,sans-serif;color:${C.ink}">${esc(cr.location || 'Not specified')}</div>
          </td>
          <td width="34%" style="padding:6px 0 6px 0;vertical-align:top">
            <div style="font:500 11px Arial,sans-serif;color:${C.muted};margin-bottom:2px">Manager Email</div>
            <div style="font:600 12px Arial,sans-serif;color:${C.ink}">${esc(cr.managerEmail || '—')}</div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Section 2: Change Details -->
    <div style="border-top:1px solid ${C.border};padding-top:14px;margin-top:14px">
      <div style="font:700 13px Arial,sans-serif;color:${C.ink};margin-bottom:10px">Section 2: Change Details</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:14px">
        <tr>
          <td colspan="2" style="padding:6px 0;vertical-align:top">
            <div style="font:500 11px Arial,sans-serif;color:${C.muted};margin-bottom:2px">Change Title</div>
            <div style="font:700 13px Arial,sans-serif;color:${C.ink}">${esc(cr.title || 'Untitled Request')}</div>
          </td>
        </tr>
        <tr>
          <td width="50%" style="padding:6px 10px 6px 0;vertical-align:top">
            <div style="font:500 11px Arial,sans-serif;color:${C.muted};margin-bottom:2px">Category</div>
            <div style="font:600 13px Arial,sans-serif;color:${C.ink}">${esc(cr.category || '—')}</div>
          </td>
          <td width="50%" style="padding:6px 0;vertical-align:top">
            <div style="font:500 11px Arial,sans-serif;color:${C.muted};margin-bottom:2px">Sub-category</div>
            <div style="font:600 13px Arial,sans-serif;color:${C.ink}">${esc(cr.subCategory || 'Standard')}</div>
          </td>
        </tr>
        <tr>
          <td width="50%" style="padding:6px 10px 6px 0;vertical-align:top">
            <div style="font:500 11px Arial,sans-serif;color:${C.muted};margin-bottom:2px">Start Date</div>
            <div style="font:600 13px monospace;color:${C.ink}">${esc(startDate)}</div>
          </td>
          <td width="50%" style="padding:6px 0;vertical-align:top"></td>
        </tr>
      </table>
    </div>

    <!-- Dynamic Action & Specification Details Box -->
    ${customEntries.length > 0 ? `
      <div style="background:#F8FAFC;border:1px solid ${C.border};border-radius:8px;padding:14px 16px;margin:16px 0">
        <div style="font:700 11px Arial,sans-serif;color:${C.ink};text-transform:uppercase;letter-spacing:0.04em;margin-bottom:10px">
          ACTION &amp; SPECIFICATION DETAILS
        </div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
          ${(() => {
            const rows = [];
            for (let i = 0; i < customEntries.length; i += 2) {
              const [k1, v1] = customEntries[i];
              const second = customEntries[i + 1];
              rows.push(`
                <tr>
                  <td width="50%" style="padding:6px 10px 6px 0;vertical-align:top">
                    <div style="font:500 11px Arial,sans-serif;color:${C.muted};margin-bottom:2px">${esc(formatFieldLabel(k1))}</div>
                    <div style="font:700 13px Arial,sans-serif;color:${C.ink};word-break:break-word">${esc(v1)}</div>
                  </td>
                  ${second ? `
                    <td width="50%" style="padding:6px 0;vertical-align:top">
                      <div style="font:500 11px Arial,sans-serif;color:${C.muted};margin-bottom:2px">${esc(formatFieldLabel(second[0]))}</div>
                      <div style="font:700 13px Arial,sans-serif;color:${C.ink};word-break:break-word">${esc(second[1])}</div>
                    </td>
                  ` : `<td width="50%"></td>`}
                </tr>
              `);
            }
            return rows.join('');
          })()}
        </table>
      </div>
    ` : ''}

    <!-- Raised Date & Business Justification -->
    <div style="margin:14px 0 18px">
      <div style="font:700 11px Arial,sans-serif;color:${C.ink};margin-bottom:2px">Raised Date</div>
      <div style="font:500 13px Arial,sans-serif;color:${C.muted};margin-bottom:12px">${esc(raisedDate)}</div>

      <div style="font:700 11px Arial,sans-serif;color:${C.ink};margin-bottom:4px">Business Justification</div>
      <div style="background:#F8FAFC;border:1px solid ${C.border};border-radius:6px;padding:10px 12px;font:400 13px/1.5 Arial,sans-serif;color:${C.ink}">
        ${esc(cr.justification || 'No justification entered.')}
      </div>
    </div>

    <!-- Action Decision Buttons -->
    <div style="margin:22px 0 8px;padding:16px;background:#F1F5F9;border-radius:10px;border:1px solid #CBD5E1">
      <div style="font:700 12px Arial,sans-serif;color:#334155;margin-bottom:12px;text-align:center;letter-spacing:0.04em">
        CHANGE MANAGER ACTION REQUIRED
      </div>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td align="center" style="padding:6px">
            <a href="${approveUrl}" style="display:inline-block;padding:11px 24px;background-color:#059669;color:#ffffff;font:700 13px Arial,sans-serif;text-decoration:none;border-radius:7px;box-shadow:0 2px 4px rgba(5,150,105,0.25)">
              ✓ Approve Request
            </a>
          </td>
          <td align="center" style="padding:6px">
            <a href="${rejectUrl}" style="display:inline-block;padding:11px 24px;background-color:#DC2626;color:#ffffff;font:700 13px Arial,sans-serif;text-decoration:none;border-radius:7px;box-shadow:0 2px 4px rgba(220,38,38,0.25)">
              ✕ Reject Request
            </a>
          </td>
        </tr>
      </table>
      <div style="font:400 11px Arial,sans-serif;color:#64748B;text-align:center;margin-top:12px">
        📎 Full request dossier with lifecycle is attached as <strong>${esc(cr.id)}_Details.html</strong>
      </div>
    </div>
  `;

  const html = renderEmail({
    preheader: `${cr.id} submitted by ${reqName} is awaiting your approval as Change Manager`,
    heading: `Approval Required: ${cr.id}`,
    intro: `<strong>${esc(reqName)}</strong> has submitted change request <strong>${esc(cr.id)} (${esc(cr.title)})</strong> and is awaiting your approval as Change Manager.`,
    rows: [],
    bodyHtml,
    footnote: 'You can approve or reject directly using the buttons above or the attached dossier. Automated message from <strong>ChangeDesk</strong>.'
  });

  const text =
    `Approval Required: ${cr.title} (${cr.id})\n\n` +
    `${reqName} submitted ${cr.id} and is awaiting your approval as Change Manager.\n\n` +
    `Section 1: Requester Details\n` +
    `Requester / Employee: ${reqName}\n` +
    `Employee ID: ${cr.employeeId || cr.empId || 'N/A'}\n` +
    `Employee Email: ${cr.employeeEmail || cr.requesterEmail || '—'}\n` +
    `Location: ${cr.location || 'Not specified'}\n` +
    `Manager Email: ${cr.managerEmail || '—'}\n\n` +
    `Section 2: Change Details\n` +
    `Change Title: ${cr.title}\n` +
    `Category: ${cr.category}\n` +
    `Sub-category: ${cr.subCategory || 'Standard'}\n` +
    `Start Date: ${startDate}\n\n` +
    (customEntries.length > 0 ? `Action & Specification Details:\n` + customEntries.map(([k, v]) => `${formatFieldLabel(k)}: ${v}`).join('\n') + `\n\n` : '') +
    (cr.justification ? `Business Justification:\n${cr.justification}\n\n` : '') +
    `Approve Request: ${approveUrl}\nReject Request: ${rejectUrl}\n\nFull dossier attached as ${cr.id}_Details.html\n`;

  const reportHtml = generateChangeRequestReportHtml({ cr, requesterName: reqName, approveUrl, rejectUrl });

  const attachments = [
    ...mailAttachments(),
    {
      filename: `${cr.id}_Details.html`,
      content: reportHtml,
      contentType: 'text/html'
    }
  ];

  return sendMail({ to: primary, cc, subject, text, html, attachments });
};

const plainRows = (rows = []) => rows.map(([k, v]) => `${k}: ${v}`).join('\n');

/** New user invited → send them a welcome mail with a sign-in link. */
export const sendUserInviteEmail = async ({ user, tempPassword, invitedByName }) => {
  const url = `${appUrl()}/`;
  const firstName = (user.name || '').trim().split(/\s+/)[0] || 'there';

  const rows = [
    ['Email', user.email],
    ['Role', user.role || 'Requester']
  ];
  if (tempPassword) rows.push(['Temporary password', tempPassword]);

  const subject = 'Your ChangeDesk account is ready';

  const html = renderEmail({
    preheader: 'An administrator has created a ChangeDesk account for you.',
    heading: `Welcome to ChangeDesk, ${firstName}`,
    intro: `${esc(invitedByName || 'An administrator')} has created a ChangeDesk account for you. Use the details below to sign in.`,
    rows,
    bodyHtml: tempPassword
      ? `<p style="font:400 12px/1.6 Arial,Helvetica,sans-serif;color:${C.muted};margin:12px 0 0">
           Sign in with your email and the temporary password above, then change it from your profile.
         </p>`
      : `<p style="font:400 12px/1.6 Arial,Helvetica,sans-serif;color:${C.muted};margin:12px 0 0">
           Sign in with your work email to get started.
         </p>`,
    ctaLabel: 'Sign in to ChangeDesk',
    ctaUrl: url,
    footnote:
      "If you weren't expecting this, contact your IT administrator. Automated message from <strong>ChangeDesk</strong>."
  });

  const text =
    `Welcome to ChangeDesk, ${firstName}.\n\n` +
    `${invitedByName || 'An administrator'} has created an account for you.\n\n` +
    plainRows(rows) +
    `\n\nSign in: ${url}\n`;

  return sendMail({ to: user.email, subject, text, html, attachments: mailAttachments() });
};
