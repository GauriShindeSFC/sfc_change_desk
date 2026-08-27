// ────────────────────────────────────────────────────────────────
//  Send sample ChangeDesk emails to an address, to preview the
//  templates.
//
//    npm run mail:test -- you@example.com
//    npm run mail:test -- you@example.com invite
//    npm run mail:test -- you@example.com change-request
//
//  If MAIL_ENABLED=true + SMTP_* are set, it uses the real transport.
//  Otherwise it spins up a throwaway Ethereal inbox and prints a
//  preview URL for each message (nothing reaches a real inbox).
// ────────────────────────────────────────────────────────────────
import '../config/env.js';
import nodemailer from 'nodemailer';
import {
  setTransporter,
  sendChangeRequestCreatedEmail,
  sendUserInviteEmail
} from '../services/mailService.js';

const to = process.argv[2];
const which = (process.argv[3] || 'both').toLowerCase();

if (!to) {
  console.error('Usage: npm run mail:test -- <recipient> [invite|change-request|both]');
  process.exit(1);
}

const run = async () => {
  const live = String(process.env.MAIL_ENABLED).toLowerCase() === 'true' && process.env.SMTP_HOST;

  if (!live) {
    const acc = await nodemailer.createTestAccount();
    console.log(`[mail:test] MAIL_ENABLED is off — using a throwaway Ethereal inbox (user: ${acc.user})`);
    setTransporter(
      nodemailer.createTransport({
        host: acc.smtp.host,
        port: acc.smtp.port,
        secure: acc.smtp.secure,
        auth: { user: acc.user, pass: acc.pass }
      })
    );
  } else {
    console.log(`[mail:test] sending live via ${process.env.SMTP_HOST}`);
  }

  if (which === 'change-request' || which === 'both') {
    const r = await sendChangeRequestCreatedEmail({
      cr: {
        id: 'CR-2049',
        title: 'Upgrade payment-gateway API to v4',
        category: 'Software Deployment',
        risk: 'Medium',
        environment: 'Production',
        hostname: 'PROD-API-GW-01',
        raisedDate: '27 Aug 2026',
        justification:
          'Vendor deprecates the v3 API on 15 Sep; upgrading now avoids a hard cutover and unlocks webhook support Finance needs.'
      },
      requesterName: 'Priya Nair',
      approverEmails: [to],
      managerEmail: null
    });
    console.log('[mail:test] change-request email:', r);
  }

  if (which === 'invite' || which === 'both') {
    const r = await sendUserInviteEmail({
      user: {
        name: 'Gautam Shah',
        email: to,
        role: 'CAB Approver',
        department: 'IT Operations'
      },
      tempPassword: 'Fox-4821',
      invitedByName: 'Gauri Shinde'
    });
    console.log('[mail:test] invite email:', r);
  }
};

run().catch((err) => {
  console.error('[mail:test] failed:', err);
  process.exit(1);
});
