// ────────────────────────────────────────────────────────────────
//  Service layer – all reads/writes go through Sequelize models and
//  their relationships. Returns data shaped exactly as the frontend
//  consumes it (see ../utils/serializers.js).
// ────────────────────────────────────────────────────────────────
import { Op } from 'sequelize';
import {
  sequelize,
  Role,
  User,
  Workflow,
  CatalogItem,
  ChangeRequest,
  AuditLog,
  CategoryBreakdown,
  StatusBreakdown,
  MonthlyVolume,
  DepartmentVolume,
  AppConfig
} from '../models/index.js';
import bcrypt from 'bcryptjs';
import { formatTimestamp } from '../data/store.js';
import { generateTempPassword } from './authService.js';
import { sendChangeRequestCreatedEmail, sendUserInviteEmail } from './mailService.js';
import {
  serializeChangeRequest,
  serializeWorklistEntry,
  serializeCatalogItem,
  serializeCatalogueTemplate,
  serializeWorkflow,
  serializeUser,
  serializeRole,
  serializeAuditLog,
  serializeMetricCards
} from '../utils/serializers.js';

// Includes reused across change-request queries.
const CR_INCLUDE = [
  { model: User, as: 'requester', attributes: ['id', 'name'] },
  { model: User, as: 'approver', attributes: ['id', 'name'] },
  { model: Workflow, as: 'workflow', attributes: ['id', 'name'] }
];

// ---------- AppConfig singletons --------------------------

const getConfig = async (key, fallback = {}) => {
  const row = await AppConfig.findByPk(key);
  return row ? row.value : fallback;
};

const updateConfig = async (key, mutate, tx) => {
  const row = await AppConfig.findByPk(key, { transaction: tx });
  const current = row ? row.value : {};
  const next = { ...current, ...mutate(current) };
  if (row) {
    row.value = next;
    row.changed('value', true); // JSONB mutation detection
    await row.save({ transaction: tx });
  } else {
    await AppConfig.create({ key, value: next }, { transaction: tx });
  }
  return next;
};

// ---------- Audit log ------------------------------------

export const addAuditLog = async ({ actorId = null, action, ref = '—', detail = '' }, tx) =>
  AuditLog.create({ timestamp: formatTimestamp(), actorId, action, ref, detail }, { transaction: tx });

// ---------- Dashboard ----------------------------------

export const getMetricsService = async () => serializeMetricCards(await getConfig('dashboard_stats'));

export const getCategoryMetricsService = async () =>
  (await CategoryBreakdown.findAll()).map((r) => r.get({ plain: true }));

export const getStatusBreakdownService = async () =>
  (await StatusBreakdown.findAll()).map((r) => r.get({ plain: true }));

// ---------- Change requests ----------------------------

export const getChangeRequestsService = async () => {
  const rows = await ChangeRequest.findAll({ include: CR_INCLUDE, order: [['submittedAt', 'DESC']] });
  return rows.map(serializeChangeRequest);
};

export const filterChangeRequestsByCategoryService = async (category) => {
  const where =
    category && category.toLowerCase() !== 'all'
      ? { category: { [Op.iLike]: `%${category}%` } }
      : undefined;
  const rows = await ChangeRequest.findAll({
    where,
    include: CR_INCLUDE,
    order: [['submittedAt', 'DESC']]
  });
  return rows.map(serializeChangeRequest);
};

const nextChangeRequestId = async () => {
  const ids = (await ChangeRequest.findAll({ attributes: ['id'], raw: true })).map(
    (r) => parseInt(String(r.id).replace(/\D/g, ''), 10) || 0
  );
  return `CR-${(ids.length ? Math.max(...ids) : 2049) + 1}`;
};

// Emails of every active "CAB Approver" — the people who review new CRs.
const getApproverEmails = async () => {
  const rows = await User.findAll({
    attributes: ['email'],
    where: { status: 'Active' },
    include: [{ model: Role, as: 'role', attributes: [], where: { name: 'CAB Approver' } }],
    raw: true
  });
  return rows.map((r) => r.email).filter(Boolean);
};

const resolveUserId = async (idOrName, fallback = 'usr-1') => {
  if (!idOrName) return fallback;
  const hit = await User.findOne({ where: { [Op.or]: [{ id: idOrName }, { name: idOrName }] } });
  return hit ? hit.id : fallback;
};

export const createChangeRequestService = async (payload = {}) => {
  const isDraft = Boolean(payload.isDraft);
  const risk = payload.risk || 'Medium';
  const status = isDraft ? 'Draft' : 'Pending';
  const requesterId = await resolveUserId(payload.requesterId || payload.requester);

  const id = await nextChangeRequestId();
  await ChangeRequest.create({
    id,
    title: payload.title || 'Untitled change request',
    category: payload.category || 'Software Deployment',
    subCategory: payload.subCategory || '',
    department: payload.department || 'IT Operations',
    contactNumber: payload.contactNumber || '',
    managerEmail: payload.managerEmail || '',
    hostname: payload.hostname || '',
    location: payload.location || 'Ahmedabad HQ',
    environment: payload.environment || 'Production',
    justification: payload.justification || '',
    startDate: payload.startDate || '',
    endDate: payload.endDate || '',
    risk,
    activeStep: isDraft ? 0 : 1,
    status,
    isDraft,
    submittedAt: new Date(),
    closedAt: null,
    requesterId,
    approverId: null,
    workflowId: payload.workflowId || null
  });

  if (!isDraft) {
    await updateConfig('dashboard_stats', (s) => ({
      total: (s.total || 0) + 1,
      pending: (s.pending || 0) + 1
    }));
  }

  await addAuditLog({
    actorId: requesterId,
    action: isDraft ? 'Saved Draft Change Request' : 'Created Change Request',
    ref: id,
    detail: `${isDraft ? 'Saved draft' : 'Submitted'} ${id} ${payload.title || 'Untitled change request'}${
      isDraft ? '' : ' for CAB review.'
    }`
  });

  const created = await ChangeRequest.findByPk(id, { include: CR_INCLUDE });
  const serialized = serializeChangeRequest(created);

  // Notify the CAB approver(s) + the requester's manager. Fire-and-forget:
  // a slow or failing SMTP must never break change-request creation.
  if (!isDraft) {
    Promise.all([
      getApproverEmails(),
      User.findByPk(requesterId, { attributes: ['name', 'email'], raw: true })
    ])
      .then(([approverEmails, requester]) =>
        sendChangeRequestCreatedEmail({
          cr: serialized,
          requesterName: requester?.name,
          approverEmails,
          managerEmail: payload.managerEmail
        })
      )
      .catch((err) => console.error('[mail] change-request notification failed:', err.message));
  }

  return serialized;
};

// ---------- CAB worklist ------------------------------
// The worklist is simply the pending change requests.

export const getWorklistService = async () => {
  const [rows, metrics] = await Promise.all([
    ChangeRequest.findAll({
      where: { status: 'Pending' },
      include: [{ model: User, as: 'requester', attributes: ['id', 'name'] }],
      order: [['submittedAt', 'ASC']]
    }),
    getConfig('worklist_metrics')
  ]);
  return { data: rows.map(serializeWorklistEntry), metrics: { ...metrics, pending: rows.length } };
};

const WORKLIST_ACTIONS = {
  approve: { status: 'Approved', metric: 'approved', logAction: 'CR Approved', verb: 'Approved' },
  reject: { status: 'Rejected', metric: 'rejected', logAction: 'CR Rejected', verb: 'Rejected' },
  sendback: { status: 'Draft', metric: 'sentBack', logAction: 'CR Sent Back', verb: 'Sent back' }
};

export const applyWorklistActionService = async ({ id, action, actorId = 'usr-1' } = {}) => {
  const config = WORKLIST_ACTIONS[action];
  if (!config) {
    const err = new Error(`Unknown worklist action "${action}"`);
    err.statusCode = 400;
    throw err;
  }

  await sequelize.transaction(async (tx) => {
    const cr = await ChangeRequest.findByPk(id, { transaction: tx });
    if (!cr) {
      const err = new Error(`Change request "${id}" not found`);
      err.statusCode = 404;
      throw err;
    }

    if (cr.status === 'Pending') {
      cr.status = config.status;
      if (action === 'approve' || action === 'reject') cr.approverId = actorId;
      if (action === 'reject') cr.closedAt = new Date();
      await cr.save({ transaction: tx });

      await updateConfig(
        'dashboard_stats',
        (s) => ({
          pending: Math.max(0, (s.pending || 0) - 1),
          ...(action === 'approve' ? { approved: (s.approved || 0) + 1 } : {}),
          ...(action === 'reject' ? { rejected: (s.rejected || 0) + 1 } : {})
        }),
        tx
      );
    }

    await updateConfig(
      'worklist_metrics',
      (m) => ({ [config.metric]: (m[config.metric] || 0) + 1 }),
      tx
    );

    await addAuditLog(
      {
        actorId,
        action: config.logAction,
        ref: id,
        detail: `${config.verb} ${id} ${cr.title}.`
      },
      tx
    );
  });

  const pending = await ChangeRequest.count({ where: { status: 'Pending' } });
  const metrics = await getConfig('worklist_metrics');
  return { id, action, status: config.status, worklistMetrics: { ...metrics, pending } };
};

// ---------- Change catalog (browse) -----------------

export const getCatalogService = async () => {
  const rows = await CatalogItem.findAll({ order: [['id', 'ASC']] });
  return rows.map(serializeCatalogItem);
};

// ---------- Catalogue management (admin) ------------

export const getCatalogueManagementService = async () => {
  const [templates, wf] = await Promise.all([
    CatalogItem.findAll({
      include: [{ model: Workflow, as: 'workflow', attributes: ['id', 'name'] }],
      order: [['id', 'ASC']]
    }),
    Workflow.findAll({
      include: [{ model: CatalogItem, as: 'catalogItems', attributes: ['id', 'title'] }],
      order: [['id', 'ASC']]
    })
  ]);
  return {
    data: templates.map(serializeCatalogueTemplate),
    workflows: wf.map(serializeWorkflow)
  };
};

const nextCatalogItemId = async () => {
  const ids = (await CatalogItem.findAll({ attributes: ['id'], raw: true })).map(
    (r) => parseInt(String(r.id).replace(/\D/g, ''), 10) || 0
  );
  const n = (ids.length ? Math.max(...ids) : 0) + 1;
  return `CAT-${String(n).padStart(2, '0')}`;
};

export const createCatalogItemService = async (payload = {}) => {
  const id = await nextCatalogItemId();
  let workflowId = payload.workflowId || null;
  if (!workflowId && payload.workflow) {
    const wf = await Workflow.findOne({ where: { name: payload.workflow } });
    workflowId = wf ? wf.id : null;
  }
  if (!workflowId) workflowId = 'wf-1';

  await CatalogItem.create({
    id,
    title: payload.title || 'New Template',
    category: payload.category || 'Software',
    description: payload.description || '',
    sla: payload.sla || '3 business days',
    risk: payload.risk || 'Medium',
    iconBg: payload.iconBg || '#EBF5FF',
    iconColor: payload.iconColor || '#2563EB',
    status: payload.status || 'Active',
    workflowId
  });

  await addAuditLog({
    actorId: await resolveUserId(payload.actor || 'Gauri Shinde'),
    action: 'Catalog Template Created',
    ref: id,
    detail: `Added new template ${id} ${payload.title || 'New Template'} to Change Catalog.`
  });

  const created = await CatalogItem.findByPk(id, {
    include: [{ model: Workflow, as: 'workflow', attributes: ['id', 'name'] }]
  });
  return serializeCatalogueTemplate(created);
};

// ---------- Settings -------------------------------

export const getSettingsUsersService = async () => {
  const rows = await User.findAll({
    include: [{ model: Role, as: 'role', attributes: ['id', 'name'] }],
    order: [['id', 'ASC']]
  });
  return rows.map(serializeUser);
};

const STATUS_ALIASES = { enabled: 'Active', disabled: 'Inactive', active: 'Active', inactive: 'Inactive' };

/** Invite a new user: create the row, then email them a sign-in link. */
export const createSettingsUserService = async (payload = {}, meta = {}) => {
  const name = String(payload.name || '').trim();
  const email = String(payload.email || '').trim().toLowerCase();
  if (!name || !email) {
    const e = new Error('Name and email are required');
    e.statusCode = 400;
    throw e;
  }

  const clash = await User.findOne({ where: { email: { [Op.iLike]: email } } });
  if (clash) {
    const e = new Error('A user with that email already exists');
    e.statusCode = 409;
    throw e;
  }

  const roleName = payload.role || payload.roleName || 'Requester';
  const role = await Role.findOne({ where: { name: { [Op.iLike]: roleName } } });
  const status = STATUS_ALIASES[String(payload.status || 'Active').toLowerCase()] || 'Active';

  const ids = (await User.findAll({ attributes: ['id'], raw: true })).map(
    (r) => parseInt(String(r.id).replace(/\D/g, ''), 10) || 0
  );
  const seq = (ids.length ? Math.max(...ids) : 0) + 1;

  const tempPassword = generateTempPassword();
  await User.create({
    id: `usr-${seq}`,
    name,
    email,
    employeeId: payload.employeeId || payload.empId || `EMP-${10500 + seq}`,
    department: payload.department || payload.dept || 'IT Operations',
    status,
    authProvider: 'local',
    passwordHash: await bcrypt.hash(tempPassword, 10),
    roleId: role ? role.id : null
  });

  await addAuditLog({
    actorId: meta.actorId || null,
    action: 'User Invited',
    ref: `usr-${seq}`,
    detail: `Invited ${name} (${email}) as ${role ? role.name : roleName}.`
  });

  const created = await User.findByPk(`usr-${seq}`, {
    include: [{ model: Role, as: 'role', attributes: ['id', 'name'] }]
  });
  const serialized = serializeUser(created);

  // Fire-and-forget welcome email with a sign-in link.
  sendUserInviteEmail({ user: serialized, tempPassword, invitedByName: meta.invitedByName }).catch((err) =>
    console.error('[mail] user-invite notification failed:', err.message)
  );

  return serialized;
};

export const getSettingsRolesService = async () => {
  const rows = await Role.findAll({
    include: [{ model: User, as: 'users', attributes: ['id'] }],
    order: [['id', 'ASC']]
  });
  return rows.map(serializeRole);
};

const AUDIT_FILTERS = {
  'change requests': (log) => /Created|Draft/i.test(log.action),
  approvals: (log) => /Approved|Rejected|Sent Back/i.test(log.action),
  'catalog & workflow': (log) => /Catalog|Workflow/i.test(log.action),
  'user & role changes': (log) => /User|Permission|Role/i.test(log.action)
};

export const getSettingsAuditLogsService = async (filter = 'All activity') => {
  const rows = await AuditLog.findAll({
    include: [{ model: User, as: 'actor', attributes: ['id', 'name'] }],
    order: [['id', 'DESC']]
  });
  const logs = rows.map(serializeAuditLog);
  const key = String(filter).toLowerCase();
  return key === 'all activity' || !AUDIT_FILTERS[key] ? logs : logs.filter(AUDIT_FILTERS[key]);
};

// ---------- Reports -------------------------------

export const getReportsMetricsService = async () => {
  const [metrics, monthly, dept] = await Promise.all([
    getConfig('report_metrics'),
    MonthlyVolume.findAll({ order: [['sortIndex', 'ASC']] }),
    DepartmentVolume.findAll({ order: [['sortIndex', 'ASC']] })
  ]);
  const strip = (rows) =>
    rows.map((r) => {
      const { sortIndex, ...rest } = r.get({ plain: true });
      return rest;
    });
  return { metrics, monthlyData: strip(monthly), departmentData: strip(dept) };
};
