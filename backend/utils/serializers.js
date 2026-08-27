// Turn model rows (with their includes) into the exact JSON the
// frontend renders. All presentation fields are added here.
import { riskStyle, statusStyle, userStatusStyle, formatDate, relativeTime } from '../data/store.js';

const plain = (row) => (row && typeof row.get === 'function' ? row.get({ plain: true }) : row);

// ---------- Change requests -------------------------------
// Needs includes: requester, approver, workflow
export const serializeChangeRequest = (row) => {
  const cr = plain(row);
  const {
    requester, approver, workflow,
    requesterId, approverId, workflowId,
    submittedAt, closedAt, createdAt, updatedAt,
    ...rest
  } = cr;
  return {
    ...rest,
    requester: requester?.name ?? null,
    approver: approver?.name ?? null,
    workflow: workflow?.name ?? null,
    raisedDate: submittedAt ? formatDate(new Date(submittedAt)) : '',
    closedDate: closedAt ? formatDate(new Date(closedAt)) : 'Open',
    ...riskStyle(cr.risk),
    ...statusStyle(cr.status)
  };
};

// A pending change request as it appears in the CAB worklist.
// Needs include: requester
export const serializeWorklistEntry = (row) => {
  const cr = plain(row);
  return {
    id: cr.id,
    title: cr.title,
    category: cr.category,
    requester: cr.requester?.name ?? null,
    submittedTime: `submitted ${relativeTime(cr.submittedAt)}`,
    risk: cr.risk,
    ...riskStyle(cr.risk)
  };
};

// ---------- Catalog ---------------------------------------
// GET /catalog  – browse view
export const serializeCatalogItem = (row) => {
  const c = plain(row);
  return {
    id: c.id,
    title: c.title,
    category: c.category,
    description: c.description,
    sla: c.sla,
    risk: c.risk,
    ...riskStyle(c.risk),
    iconBg: c.iconBg,
    iconColor: c.iconColor
  };
};

// GET /catalogue-management  – admin view. Needs include: workflow
export const serializeCatalogueTemplate = (row) => {
  const c = plain(row);
  return {
    id: c.id,
    title: c.title,
    category: c.category,
    sla: c.sla,
    risk: c.risk,
    ...riskStyle(c.risk),
    workflow: c.workflow?.name ?? null,
    status: c.status,
    description: c.description
  };
};

// A workflow with its derived "used by" list. Needs include: catalogItems
export const serializeWorkflow = (row) => {
  const w = plain(row);
  const usedBy =
    Array.isArray(w.catalogItems) && w.catalogItems.length
      ? w.catalogItems.map((c) => c.title).join(', ')
      : '—';
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
  return {
    id: l.id,
    timestamp: l.timestamp,
    actor: l.actor?.name ?? 'System',
    action: l.action,
    ref: l.ref,
    detail: l.detail
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
