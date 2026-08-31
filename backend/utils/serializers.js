// Turn model rows (with their includes) into the exact JSON the
// frontend renders. All presentation fields are added here.
import { riskStyle, statusStyle, userStatusStyle, formatDate, relativeTime } from '../data/store.js';

const plain = (row) => (row && typeof row.get === 'function' ? row.get({ plain: true }) : row);

// ---------- Change requests -------------------------------
// Needs includes: requester, approver, workflow, approvals
export const serializeChangeRequest = (row) => {
  const cr = plain(row);
  const {
    requester, approver, workflow, approvals,
    requesterId, approverId, workflowId,
    submittedAt, closedAt, createdAt, updatedAt,
    ...rest
  } = cr;

  const rejApproval = Array.isArray(approvals) ? approvals.find(a => (a.decision === 'Rejected' || a.action === 'Rejected') && (a.rationale || a.comments)) : null;
  const rationale = cr.rejectionReason || cr.rejection_reason || rejApproval?.rationale || rejApproval?.comments || cr.customFieldValues?.rejectionReason || (cr.status === 'Rejected' ? 'This change request was rejected during CAB review.' : null);

  return {
    ...rest,
    requester: requester?.name ?? null,
    approver: approver?.name ?? null,
    workflow: workflow?.name ?? null,
    raisedDate: submittedAt ? formatDate(new Date(submittedAt)) : '',
    closedDate: closedAt ? formatDate(new Date(closedAt)) : 'Open',
    rejectionReason: rationale,
    ...riskStyle(cr.risk),
    ...statusStyle(cr.status)
  };
};

// A pending change request as it appears in the CAB worklist.
// Needs include: requester, approvals
export const serializeWorklistEntry = (row) => {
  const cr = plain(row);
  const rejApproval = Array.isArray(cr.approvals) ? cr.approvals.find(a => (a.decision === 'Rejected' || a.action === 'Rejected') && (a.rationale || a.comments)) : null;
  const rationale = cr.rejectionReason || cr.rejection_reason || rejApproval?.rationale || rejApproval?.comments || cr.customFieldValues?.rejectionReason || (cr.status === 'Rejected' ? 'This change request was rejected during CAB review.' : null);

  return {
    id: cr.id,
    title: cr.title,
    category: cr.category,
    subCategory: cr.subCategory,
    status: cr.status || 'Pending',
    isDraft: cr.isDraft || false,
    justification: cr.justification,
    hostname: cr.hostname,
    location: cr.location,
    environment: cr.environment,
    department: cr.department,
    contactNumber: cr.contactNumber,
    managerEmail: cr.managerEmail,
    employeeEmail: cr.customFieldValues?.employeeEmail || cr.requester?.email || cr.employeeEmail || '',
    raisedDate: cr.submittedAt ? formatDate(new Date(cr.submittedAt)) : '',
    closedDate: cr.closedAt ? formatDate(new Date(cr.closedAt)) : 'Open',
    startDate: cr.startDate ? formatDate(new Date(cr.startDate)) : '',
    endDate: cr.endDate ? formatDate(new Date(cr.endDate)) : '',
    customFieldValues: cr.customFieldValues || {},
    rejectionReason: rationale,
    requester: cr.requester?.name || cr.employeeName || 'Requester',
    submittedTime: `submitted ${relativeTime(cr.submittedAt)}`,
    risk: cr.risk,
    ...riskStyle(cr.risk),
    ...statusStyle(cr.status)
  };
};

// ---------- Catalog ---------------------------------------

// A workflow with its derived "used by" list. Needs include: catalogItems
export const serializeWorkflow = (row) => {
  const w = plain(row);
  const usedBy =
    Array.isArray(w.subcategories) && w.subcategories.length
      ? w.subcategories.map((s) => s.name).join(', ')
      : 'Standard';
  return { id: w.id, name: w.name, steps: w.steps, usedBy };
};

// ---------- Settings -------------------------------------
// Needs include: role
export const serializeUser = (row) => {
  const u = plain(row);
  return {
    id: u.id,
    name: u.name,
    employeeId: u.employeeId,
    department: u.department,
    role: u.role?.name ?? null,
    email: u.email,
    status: u.status,
    ...userStatusStyle(u.status)
  };
};

// Needs include: users (id only) – usersCount is derived
export const serializeRole = (row) => {
  const r = plain(row);
  return {
    id: r.id,
    name: r.name,
    usersCount: Array.isArray(r.users) ? r.users.length : 0,
    description: r.description,
    permissions: r.permissions
  };
};

// Needs include: actor
export const serializeAuditLog = (row) => {
  const l = plain(row);
  const act = l.action || '';
  let category = 'User & role changes';
  if (/Rejected/i.test(act)) {
    category = 'Rejected';
  } else if (/Approved/i.test(act)) {
    category = 'Approvals';
  } else if (/CR|Created|Draft|Submitted/i.test(act)) {
    category = 'Change requests';
  } else if (/Catalog|Subcategory|Workflow/i.test(act)) {
    category = 'Catalog & workflow';
  }
  return {
    id: l.id,
    timestamp: l.timestamp ? String(l.timestamp) : formatDate(new Date(l.createdAt || Date.now())),
    actor: l.actor?.name ?? 'Gauri Shinde',
    action: l.action,
    reference: l.ref || '—',
    employeeEmail: l.actor?.email || 'gauri.shinde@stfox.com',
    category
  };
};

// ---------- Dashboard metric cards ----------------------
const METRIC_CARD_META = {
  total: { title: 'Total Change Requests', subtext: '▲ 12 this month', subtextColor: '#10B981', iconBg: '#EBF5FF', iconColor: '#00A4EF' },
  pending: { title: 'Pending Approval', subtext: 'CAB review pending', subtextColor: 'var(--text-secondary)', iconBg: '#FEF3C7', iconColor: '#D97706' },
  approved: { title: 'Approved', subtext: '▲ 59% of total', subtextColor: '#10B981', iconBg: '#D1FAE5', iconColor: '#059669' },
  'in-progress': { title: 'In Progress', subtext: 'Scheduled this week: 6', subtextColor: 'var(--text-secondary)', iconBg: '#F3E8FF', iconColor: '#7C3AED' },
  rejected: { title: 'Rejected', subtext: '▼ 3 this month', subtextColor: '#DC2626', iconBg: '#FEE2E2', iconColor: '#DC2626' }
};

export const serializeMetricCards = (stats = {}) => {
  const counts = {
    total: stats.total,
    pending: stats.pending,
    approved: stats.approved,
    'in-progress': stats.inProgress,
    rejected: stats.rejected
  };
  return Object.entries(METRIC_CARD_META).map(([id, meta]) => ({
    id,
    count: String(counts[id] ?? 0),
    ...meta
  }));
};
