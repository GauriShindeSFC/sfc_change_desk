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

const env = process.env;

const appUrl = () => (env.APP_BASE_URL || 'http://localhost:5174').replace(/\/+$/, '');

// The logo is embedded in the message as an inline (CID) attachment so it
// renders in any mail client — a localhost/URL src would be broken for
// external recipients. MAIL_LOGO_URL overrides with a hosted image.
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

const mailEnabled = () =>
  String(env.MAIL_ENABLED).toLowerCase() === 'true' && Boolean(env.SMTP_HOST);

let transporter = null;
let injected = false;
const getTransporter = () => {
  if (injected) return transporter;
  if (!mailEnabled()) return null;
  if (!transporter) {
    const secure = String(env.SMTP_SECURE).toLowerCase() === 'true';
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: Number(env.SMTP_PORT) || 587,
      secure, // true => port 465
      requireTLS: !secure, // STARTTLS on 587 (required by Office 365 / Gmail)
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined
    });
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

/**
 * Render an email-client-safe HTML document (table layout, inline styles).
 * `intro` and `bodyHtml` are treated as trusted HTML — escape call-site data.
 */
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

// ---------- Low-level send ---------------------------------

/** Never throws — returns a small status object. */
export const sendMail = async ({ to, cc, subject, text, html, attachments }) => {
  const toList = asList(to);
  const ccList = asList(cc).filter((a) => !toList.includes(a));
  const all = [...new Set([...toList, ...ccList])];

  const t = getTransporter();
  if (!t) {
    console.log(`[mail] disabled — would send "${subject}" to ${all.join(', ') || '(nobody)'}`);
    return { skipped: 'mail-disabled', recipients: all };
  }
  if (all.length === 0) {
    console.log(`[mail] no recipients for "${subject}" — skipped`);
    return { skipped: 'no-recipients' };
  }

  try {
    const info = await t.sendMail({
      from: env.MAIL_FROM || env.SMTP_USER,
      to: toList.length ? toList : ccList,
      cc: toList.length ? ccList : undefined,
      subject,
      text,
      html,
      attachments: attachments && attachments.length ? attachments : undefined
    });
    const preview = nodemailer.getTestMessageUrl?.(info);
    console.log(
      `[mail] sent "${subject}" -> ${all.join(', ')} (id ${info.messageId})` +
        (preview ? ` — preview ${preview}` : '')
    );
    return { sent: true, messageId: info.messageId, previewUrl: preview || null };
  } catch (err) {
    console.error(`[mail] FAILED "${subject}": ${err.message}`);
    return { error: err.message };
  }
};

/** Verify the SMTP connection at boot (best-effort, logs only). */
export const verifyMailTransport = async () => {
  const t = getTransporter();
  if (!t) {
    console.log('[mail] notifications are OFF (set MAIL_ENABLED=true + SMTP_* in .env to enable)');
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

const plainRows = (rows) => rows.map(([k, v]) => `${k}: ${v}`).join('\n');

/** New change request submitted → notify CAB approvers (+ manager as CC). */
export const sendChangeRequestCreatedEmail = async ({ cr, requesterName, approverEmails, managerEmail }) => {
  const url = `${appUrl()}/`;
  const to = asList(approverEmails);
  const cc = asList(managerEmail);
  const primary = to.length ? to : asList(env.MAIL_APPROVER_FALLBACK);

  const rows = [
    ['Change request', cr.id],
    ['Title', cr.title],
    ['Category', cr.category],
    ['Risk', cr.risk],
    ['Environment', cr.environment || '—'],
    ['Target host', cr.hostname || '—'],
    ['Raised by', requesterName || '—'],
    ['Submitted', cr.raisedDate || '—']
  ];

  const subject = `[ChangeDesk] ${cr.id} — ${cr.title} awaiting CAB review`;

  const html = renderEmail({
    preheader: `${cr.id} raised by ${requesterName || 'a requester'} needs CAB review`,
    heading: 'New change request awaiting your review',
    intro: `<strong>${esc(requesterName || 'A requester')}</strong> submitted <strong>${esc(cr.id)}</strong> for CAB review.`,
    rows,
    bodyHtml: cr.justification
      ? `<p style="font:700 11px Arial,Helvetica,sans-serif;color:${C.muted};letter-spacing:.06em;margin:18px 0 4px">JUSTIFICATION</p>
         <p style="font:400 13px/1.6 Arial,Helvetica,sans-serif;color:${C.ink};margin:0">${esc(cr.justification)}</p>`
      : '',
    ctaLabel: 'Review in ChangeDesk',
    ctaUrl: url
  });

  const text =
    `${requesterName || 'A requester'} submitted ${cr.id} for CAB review.\n\n` +
    plainRows(rows) +
    (cr.justification ? `\n\nJustification:\n${cr.justification}` : '') +
    `\n\nReview it: ${url}\n`;

  return sendMail({ to: primary, cc, subject, text, html, attachments: mailAttachments() });
};

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
