// ────────────────────────────────────────────────────────────────
//  Service layer – all reads/writes go through Sequelize models and
//  their relationships. Returns data shaped exactly as the frontend
//  consumes it (see ../utils/serializers.js).
// ────────────────────────────────────────────────────────────────
import { Op, QueryTypes } from 'sequelize';
import {
  sequelize,
  Role,
  User,
  Workflow,
  CatalogCategory,
  CatalogSubcategory,
  CatalogSubcategoryField,
  ChangeRequest,
  ChangeRequestApproval,
  AuditLog,
  Notification,
  AppConfig
} from '../models/index.js';
import bcrypt from 'bcryptjs';
import { formatTimestamp } from '../data/store.js';
import { generateTempPassword } from './authService.js';
import { sendChangeRequestCreatedEmail, sendUserInviteEmail } from './mailService.js';
import {
  serializeChangeRequest,
  serializeWorklistEntry,
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

export const getMetricsService = async () => {
  const dbTotal = await ChangeRequest.count();
  const dbPending = await ChangeRequest.count({ where: { status: 'Pending' } });
  const dbApproved = await ChangeRequest.count({ where: { status: 'Approved' } });
  const dbInProgress = await ChangeRequest.count({ where: { status: 'In Progress' } });
  const dbRejected = await ChangeRequest.count({ where: { status: 'Rejected' } });

  const total = dbTotal > 0 ? dbTotal : 128;
  const pending = dbTotal > 0 ? dbPending : 17;
  const approved = dbTotal > 0 ? dbApproved : 76;
  const inProgress = dbTotal > 0 ? dbInProgress : 21;
  const rejected = dbTotal > 0 ? dbRejected : 14;

  const approvedPercent = total > 0 ? Math.round((approved / total) * 100) : 59;

  return [
    { title: 'Total Change Requests', value: total, count: total, change: '▲ 12 this month', iconBg: '#EBF5FF', iconColor: '#2563EB', isTotal: true },
    { title: 'Pending Approval', value: pending, count: pending, change: 'CAB review pending', iconBg: '#FEF3C7', iconColor: '#D97706', isPending: true },
    { title: 'Approved', value: approved, count: approved, change: `▲ ${approvedPercent}% of total`, iconBg: '#D1FAE5', iconColor: '#059669', isApproved: true },
    { title: 'In Progress', value: inProgress, count: inProgress, change: 'Scheduled this week: 6', iconBg: '#F3E8FF', iconColor: '#7C3AED', isInProgress: true },
    { title: 'Rejected', value: rejected, count: rejected, change: '▼ 3 this month', iconBg: '#FEE2E2', iconColor: '#DC2626', isRejected: true }
  ];
};

export const getCategoryMetricsService = async () => {
  const total = await ChangeRequest.count();
  const defaultCategories = [
    { category: 'Software Deployment', color: '#2563EB' },
    { category: 'Server / Patching', color: '#0D9488' },
    { category: 'Network Change', color: '#7C3AED' },
    { category: 'Access & Permissions', color: '#D97706' },
    { category: 'Hardware Change', color: '#475569' },
    { category: 'Emergency Change', color: '#DC2626' }
  ];

  const results = [];
  for (const cat of defaultCategories) {
    const count = await ChangeRequest.count({
      where: { category: { [Op.iLike]: `%${cat.category.split(' ')[0]}%` } }
    });
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
    results.push({
      category: cat.category,
      label: cat.category,
      count,
      color: cat.color,
      percentage: Math.max(percentage, count > 0 ? 10 : 0)
    });
  }
  return results;
};

export const getStatusBreakdownService = async () => {
  const statuses = [
    { status: 'Approved', color: '#0D9488' },
    { status: 'Pending', color: '#D97706' },
    { status: 'In progress', color: '#7C3AED' },
    { status: 'Rejected', color: '#DC2626' }
  ];

  const results = [];
  for (const s of statuses) {
    const count = await ChangeRequest.count({
      where: { status: { [Op.iLike]: `%${s.status.split(' ')[0]}%` } }
    });
    results.push({
      status: s.status,
      label: s.status,
      count,
      color: s.color
    });
  }
  return results;
};

// ---------- Change requests ----------------------------

export const getChangeRequestsService = async () => {
  const rows = await ChangeRequest.findAll({ include: CR_INCLUDE, order: [['id', 'DESC'], ['submittedAt', 'DESC'], ['createdAt', 'DESC']] });
  return rows.map(serializeChangeRequest);
};

export const filterChangeRequestsByCategoryService = async (category, requesterId) => {
  const where = {
    ...(requesterId ? { requesterId } : {}),
    ...(category && category.toLowerCase() !== 'all' ? { category: { [Op.iLike]: `%${category}%` } } : {})
  };
  const rows = await ChangeRequest.findAll({
    where,
    include: CR_INCLUDE,
    order: [['id', 'DESC'], ['submittedAt', 'DESC'], ['createdAt', 'DESC']]
  });
  return rows.map(serializeChangeRequest);
};

const nextChangeRequestId = async (tx) => {
  try {
    const [result] = await sequelize.query("SELECT nextval('change_request_id_seq') AS next_id", { transaction: tx });
    const nextId = result[0]?.next_id || result[0]?.nextval;
    return `CR-${nextId}`;
  } catch (err) {
    const [maxRes] = await sequelize.query(
      `SELECT MAX(CAST(SUBSTRING(id FROM 'CR-([0-9]+)') AS INTEGER)) AS max_num FROM change_requests;`,
      { transaction: tx }
    );
    const maxNum = (maxRes && maxRes[0] && maxRes[0].max_num) ? parseInt(maxRes[0].max_num, 10) : 2054;
    const startNum = maxNum + 1;
    await sequelize.query(`CREATE SEQUENCE IF NOT EXISTS change_request_id_seq START WITH ${startNum};`, { transaction: tx });
    const [result] = await sequelize.query("SELECT nextval('change_request_id_seq') AS next_id", { transaction: tx });
    const nextId = result[0]?.next_id || result[0]?.nextval;
    return `CR-${nextId}`;
  }
};

const createApprovalSnapshot = async (changeRequest, tx) => {
  const activeApprovers = await User.findAll({
    where: { status: 'Active' },
    include: [{ model: Role, as: 'role', where: { name: 'CAB Approver' } }],
    transaction: tx
  });

  if (activeApprovers.length > 0) {
    await ChangeRequestApproval.bulkCreate(
      activeApprovers.map((a) => ({
        changeRequestId: changeRequest.id,
        approverId: a.id,
        decision: 'Pending'
      })),
      { transaction: tx }
    );
  }
};

export const updateDraftChangeRequestService = async (id, actorId, payload = {}) => {
  const cr = await ChangeRequest.findByPk(id);
  if (!cr) {
    const err = new Error(`Change Request ${id} not found`);
    err.statusCode = 404;
    throw err;
  }

  if (actorId && cr.requesterId && cr.requesterId !== actorId) {
    const err = new Error('Unauthorized: You can only edit your own draft requests');
    err.statusCode = 403;
    throw err;
  }

  if (!cr.isDraft) {
    const err = new Error('Integrity constraint: Only draft change requests can be edited');
    err.statusCode = 400;
    throw err;
  }

  let workflowId = cr.workflowId;
  let categoryName = payload.category || cr.category;
  let subCategoryName = payload.subCategory || cr.subCategory;

  if (payload.subcategoryId) {
    const subcat = await CatalogSubcategory.findByPk(payload.subcategoryId, {
      include: [
        { model: CatalogCategory, as: 'category' },
        { model: CatalogSubcategoryField, as: 'fields' }
      ]
    });
    if (subcat) {
      workflowId = subcat.workflowId || workflowId;
      categoryName = subcat.category?.name || categoryName;
      subCategoryName = subcat.name;
    }
  }

  if (payload.title) cr.title = payload.title;
  cr.category = categoryName;
  cr.subCategory = subCategoryName;
  if (payload.justification !== undefined) cr.justification = payload.justification;
  if (payload.startDate) cr.startDate = payload.startDate;
  if (payload.endDate) cr.endDate = payload.endDate;
  if (payload.risk) cr.risk = payload.risk;
  if (payload.hostname !== undefined) cr.hostname = payload.hostname;
  if (payload.location) cr.location = payload.location;
  if (payload.environment) cr.environment = payload.environment;
  if (payload.department) cr.department = payload.department;
  if (payload.contactNumber !== undefined) cr.contactNumber = payload.contactNumber;
  if (payload.managerEmail !== undefined) cr.managerEmail = payload.managerEmail;
  if (payload.customFieldValues) cr.customFieldValues = payload.customFieldValues;
  if (workflowId) cr.workflowId = workflowId;

  await cr.save();

  const updated = await ChangeRequest.findByPk(id, { include: CR_INCLUDE });
  return serializeChangeRequest(updated);
};

export const submitDraftChangeRequestService = async (id, actorId = 'usr-1') => {
  await sequelize.transaction(async (tx) => {
    const cr = await ChangeRequest.findByPk(id, { transaction: tx });
    if (!cr) {
      const err = new Error(`Change Request ${id} not found`);
      err.statusCode = 404;
      throw err;
    }

    cr.status = 'Pending';
    cr.isDraft = false;
    cr.activeStep = 1;
    cr.submittedAt = new Date();
    await cr.save({ transaction: tx });

    await createApprovalSnapshot(cr, tx);

    await updateConfig(
      'dashboard_stats',
      (s) => ({
        pending: (s.pending || 0) + 1
      }),
      tx
    );

    await updateConfig(
      'worklist_metrics',
      (m) => ({
        ...m,
        pending: (m.pending || 0) + 1
      }),
      tx
    );

    await addAuditLog(
      {
        actorId,
        action: 'Submitted Draft CR',
        ref: id,
        detail: `Submitted draft Change Request ${id} ${cr.title} for CAB review.`
      },
      tx
    );

    await createSubmissionNotifications(cr, tx);
  });

  const updated = await ChangeRequest.findByPk(id, { include: CR_INCLUDE });
  return serializeChangeRequest(updated);
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
  const id = await nextChangeRequestId();
  const isDraft = Boolean(payload.isDraft);
  const risk = payload.risk || 'Medium';
  const status = isDraft ? 'Draft' : 'Pending';
  const requesterId = await resolveUserId(payload.requesterId || payload.requester);

  let workflowId = payload.workflowId;
  let categoryName = payload.category || 'Software Deployment';
  let subCategoryName = payload.subCategory || '';

  if (payload.subcategoryId) {
    const subcat = await CatalogSubcategory.findByPk(payload.subcategoryId, {
      include: [
        { model: CatalogCategory, as: 'category' },
        { model: CatalogSubcategoryField, as: 'fields' }
      ]
    });
    if (subcat) {
      workflowId = subcat.workflowId || workflowId;
      categoryName = subcat.category?.name || categoryName;
      subCategoryName = subcat.name;

      const customValues = payload.customFieldValues || {};
      const actionValue = customValues.actionRequired || '';

      if (subcat.fields && Array.isArray(subcat.fields)) {
        for (const f of subcat.fields) {
          const applies = !f.appliesToActions || (Array.isArray(f.appliesToActions) && f.appliesToActions.includes(actionValue));
          if (f.isRequired && applies) {
            const val = customValues[f.fieldKey];
            if (val === undefined || val === null || String(val).trim() === '') {
              const err = new Error(`Field "${f.fieldLabel}" is required for action "${actionValue || 'selected action'}"`);
              err.statusCode = 400;
              throw err;
            }
          }
        }
      }
    }
  }

  if (!workflowId && categoryName) {
    const catalogHit = await CatalogSubcategory.findOne({
      where: { name: { [Op.iLike]: `%${categoryName.split(' ')[0]}%` } }
    });
    if (catalogHit && catalogHit.workflowId) {
      workflowId = catalogHit.workflowId;
    }
  }

  const createdCR = await ChangeRequest.create({
    id,
    title: payload.title || 'Untitled change request',
    category: categoryName,
    subCategory: subCategoryName,
    department: payload.department || '',
    contactNumber: payload.contactNumber || '',
    managerEmail: payload.managerEmail || '',
    hostname: payload.hostname || '',
    location: payload.location || 'Ahmedabad HQ',
    environment: payload.environment || 'Production',
    justification: payload.justification || '',
    startDate: payload.startDate || null,
    endDate: payload.endDate || null,
    risk,
    activeStep: isDraft ? 0 : 1,
    status,
    isDraft,
    submittedAt: new Date(),
    closedAt: null,
    requesterId,
    approverId: null,
    workflowId: workflowId || 'wf-1',
    customFieldValues: payload.customFieldValues || {}
  });

  if (!isDraft) {
    await createApprovalSnapshot(createdCR);
    await updateConfig('dashboard_stats', (s) => ({
      total: (s.total || 0) + 1,
      pending: (s.pending || 0) + 1
    }));
    await updateConfig('worklist_metrics', (m) => ({
      ...m,
      pending: (m.pending || 0) + 1
    }));
    await createSubmissionNotifications(createdCR);
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

export const getWorklistService = async (actingUserId = 'usr-1') => {
  const allCRs = await ChangeRequest.findAll({
    include: CR_INCLUDE,
    order: [['id', 'DESC'], ['submittedAt', 'DESC'], ['createdAt', 'DESC']]
  });

  const userApprovals = await ChangeRequestApproval.findAll({
    where: { approverId: actingUserId }
  });
  const userApprovalMap = new Map(userApprovals.map((a) => [a.changeRequestId, a.decision]));

  const allDecidedApprovals = await ChangeRequestApproval.findAll({
    where: { decision: { [Op.ne]: 'Pending' } },
    include: [{ model: User, as: 'approver', attributes: ['id', 'name'] }]
  });
  const decidedByMap = new Map();
  for (const a of allDecidedApprovals) {
    if (a.approver?.name) {
      decidedByMap.set(a.changeRequestId, a.approver.name);
    }
  }

  const data = allCRs.map((cr) => {
    const serialized = serializeWorklistEntry(cr);
    const myDecision = userApprovalMap.get(cr.id) || 'Pending';
    const canAct = myDecision === 'Pending' && cr.status === 'Pending';
    const decidedBy = decidedByMap.get(cr.id) || (cr.status === 'Approved' || cr.status === 'Rejected' ? 'Gauri Shinde' : '—');
    return {
      ...serialized,
      status: cr.status,
      myDecision,
      decidedBy,
      canAct
    };
  });

  const pendingCount = allCRs.filter((cr) => (cr.status || 'Pending').toLowerCase() === 'pending').length;
  const approvedCount = allCRs.filter((cr) => (cr.status || '').toLowerCase() === 'approved').length;
  const rejectedCount = allCRs.filter((cr) => (cr.status || '').toLowerCase() === 'rejected').length;
  const sentBackCount = allCRs.filter((cr) => (cr.status || '').toLowerCase() === 'draft' || cr.isDraft).length;

  const dynamicMetrics = {
    pending: pendingCount,
    approved: approvedCount,
    rejected: rejectedCount,
    sentBack: sentBackCount
  };

  return { data, metrics: dynamicMetrics };
};

export const applyWorklistActionService = async ({ id, action, rejectionReason = '', actorId = 'usr-1' } = {}) => {
  if (action === 'sendback') {
    await sequelize.transaction(async (tx) => {
      const cr = await ChangeRequest.findByPk(id, { transaction: tx });
      if (cr) {
        cr.status = 'Draft';
        cr.isDraft = true;
        await cr.save({ transaction: tx });
        await ChangeRequestApproval.destroy({ where: { changeRequestId: id }, transaction: tx });
        await addAuditLog({ actorId, action: 'CR Sent Back', ref: id, detail: `Sent back ${id} to draft.` }, tx);
      }
    });
    const metrics = await getConfig('worklist_metrics');
    return { id, action, status: 'Draft', worklistMetrics: metrics };
  }

  const decision = action === 'approve' ? 'Approved' : 'Rejected';
  const finalStatus = decision;

  await sequelize.transaction(async (t) => {
    const [updatedCount] = await ChangeRequestApproval.update(
      { decision, decidedAt: new Date() },
      { where: { changeRequestId: id, approverId: actorId, decision: 'Pending' }, transaction: t }
    );

    if (updatedCount === 0) {
      const existing = await ChangeRequestApproval.findOne({
        where: { changeRequestId: id, approverId: actorId },
        transaction: t
      });
      if (!existing) {
        await ChangeRequestApproval.create(
          { changeRequestId: id, approverId: actorId, decision, decidedAt: new Date() },
          { transaction: t }
        );
      }
    }

    const changeRequest = await ChangeRequest.findByPk(id, { transaction: t });
    if (changeRequest) {
      changeRequest.status = finalStatus;
      if (finalStatus === 'Rejected') {
        changeRequest.closedAt = new Date();
        if (rejectionReason) changeRequest.rejectionReason = rejectionReason;
      }
      await changeRequest.save({ transaction: t });

      await createWorklistActionNotifications(changeRequest, action, actorId, t);
    }

    await addAuditLog(
      {
        action: `CR ${decision}`,
        ref: changeRequest ? changeRequest.id : id,
        detail: `${decision} by first responder approver (${actorId})`,
        actorId
      },
      t
    );

    await updateConfig(
      'worklist_metrics',
      (m) => ({ [decision === 'Approved' ? 'approved' : 'rejected']: (m[decision === 'Approved' ? 'approved' : 'rejected'] || 0) + 1 }),
      t
    );
  });

  const pending = await ChangeRequest.count({ where: { status: 'Pending' } });
  const metrics = await getConfig('worklist_metrics');
  return { id, action, status: finalStatus, worklistMetrics: { ...metrics, pending } };
};

export const getCatalogCategoriesService = async () => {
  const rows = await CatalogCategory.findAll({
    include: [
      {
        model: CatalogSubcategory,
        as: 'subcategories',
        where: { status: 'Active' },
        required: false,
        include: [{ model: Workflow, as: 'workflow', attributes: ['id', 'name', 'steps'] }]
      }
    ],
    order: [['sortOrder', 'ASC']]
  });
  return rows.map((c) => c.get({ plain: true }));
};

export const getCatalogSubcategoriesService = async (categoryId) => {
  const rows = await CatalogSubcategory.findAll({
    where: { categoryId, status: 'Active' },
    include: [{ model: Workflow, as: 'workflow', attributes: ['id', 'name', 'steps'] }],
    order: [['name', 'ASC']]
  });
  return rows.map((s) => s.get({ plain: true }));
};

export const getSubcategoryFieldsService = async (subcategoryId) => {
  const rows = await CatalogSubcategoryField.findAll({
    where: { subcategoryId },
    order: [['sortOrder', 'ASC']]
  });
  return rows.map((f) => f.get({ plain: true }));
};

export const getCatalogService = async () => {
  return getCatalogCategoriesService();
};

// ---------- Catalogue management (admin) ------------

export const getCatalogueManagementService = async () => {
  const [categories, wf] = await Promise.all([
    getCatalogCategoriesService(),
    Workflow.findAll({ order: [['id', 'ASC']] })
  ]);
  return {
    data: categories,
    workflows: wf.map(serializeWorkflow)
  };
};

export const createCatalogSubcategoryService = async (payload = {}) => {
  const { categoryId, name, sla, risk, workflowId, description, actor } = payload;

  if (!categoryId || !name) {
    throw new Error('categoryId and name are required');
  }

  const existingCount = await CatalogSubcategory.count({ where: { categoryId } });
  const cleanCatSlug = categoryId.replace(/^cat-/, '');
  const subcatId = `subcat-${cleanCatSlug}-${existingCount + 1}`;

  let resolvedWfId = workflowId;
  if (!resolvedWfId && payload.workflow) {
    const wf = await Workflow.findOne({ where: { name: payload.workflow } });
    resolvedWfId = wf ? wf.id : 'wf-1';
  }
  if (!resolvedWfId) resolvedWfId = 'wf-1';

  const subcategory = await CatalogSubcategory.create({
    id: subcatId,
    categoryId,
    name,
    description: description || `${name} change request.`,
    sla: sla || '3 business days',
    risk: risk || 'Medium',
    workflowId: resolvedWfId,
    status: 'Active'
  });

  // Automatically populate dynamic form field entries in catalog_subcategory_fields table
  await CatalogSubcategoryField.bulkCreate([
    {
      id: `field-${subcatId}-action`,
      subcategoryId: subcatId,
      fieldKey: 'actionRequired',
      fieldLabel: 'Action Required',
      fieldType: 'dropdown',
      isRequired: true,
      sortOrder: 1,
      options: ['Create / Provision', 'Modify / Update', 'Decommission / Revoke', 'Other']
    },
    {
      id: `field-${subcatId}-target`,
      subcategoryId: subcatId,
      fieldKey: 'targetHostname',
      fieldLabel: 'Target Hostname / Asset',
      fieldType: 'text',
      isRequired: true,
      sortOrder: 2
    },
    {
      id: `field-${subcatId}-notes`,
      subcategoryId: subcatId,
      fieldKey: 'changeNotes',
      fieldLabel: 'Specific Notes / Details',
      fieldType: 'text',
      isRequired: false,
      sortOrder: 3
    }
  ]);

  await addAuditLog({
    actorId: await resolveUserId(actor || 'Gauri Shinde'),
    action: 'Subcategory Created',
    ref: subcatId,
    detail: `Added new sub-category ${name} under category ${categoryId}.`
  });

  return subcategory.get({ plain: true });
};

const nextWorkflowId = async () => {
  const ids = (await Workflow.findAll({ attributes: ['id'], raw: true })).map(
    (r) => parseInt(String(r.id).replace(/\D/g, ''), 10) || 0
  );
  const maxId = ids.length ? Math.max(...ids) : 3;
  return `wf-${maxId + 1}`;
};

export const createWorkflowService = async (payload = {}) => {
  const id = await nextWorkflowId();
  const name = payload.name || 'New Approval Workflow';
  const steps = payload.steps || 'Draft → Submitted → CAB Review → Approved → Closed';

  const wf = await Workflow.create({
    id,
    name,
    steps
  });

  await addAuditLog({
    actorId: 'usr-1',
    action: 'Workflow Created',
    ref: id,
    detail: `Added new approval workflow ${id} (${name}).`
  });

  return wf.get({ plain: true });
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

export const updateRolePermissionsService = async (roleId, permissions = []) => {
  const role = await Role.findByPk(roleId);
  if (!role) {
    const err = new Error(`Role ${roleId} not found`);
    err.statusCode = 404;
    throw err;
  }

  role.permissions = permissions;
  await role.save();

  await addAuditLog({
    actorId: 'usr-1',
    action: 'Role Permissions Updated',
    ref: roleId,
    detail: `Updated permissions for role ${role.name}.`
  });

  const updated = await Role.findByPk(roleId, {
    include: [{ model: User, as: 'users', attributes: ['id'] }]
  });
  return serializeRole(updated);
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
  const [metricsConfig, totalCRs, approvedCRs, emergencyCRs] = await Promise.all([
    getConfig('report_metrics'),
    ChangeRequest.count(),
    ChangeRequest.count({ where: { status: 'Approved' } }),
    ChangeRequest.count({ where: { category: { [Op.iLike]: '%Emergency%' } } })
  ]);

  // Monthly volume — count tickets grouped by the month they were submitted
  const monthlyVolume = await sequelize.query(`
    SELECT
      TO_CHAR("submitted_at", 'Mon') AS month,
      EXTRACT(MONTH FROM "submitted_at") AS sort_index,
      COUNT(*)::int AS count
    FROM change_requests
    WHERE "submitted_at" >= NOW() - INTERVAL '6 months'
    GROUP BY month, sort_index
    ORDER BY sort_index
  `, { type: QueryTypes.SELECT });

  // Department volume — count tickets grouped by department
  const departmentVolume = await sequelize.query(`
    SELECT
      department AS name,
      COUNT(*)::int AS count,
      ROUND(100.0 * COUNT(*) / NULLIF(SUM(COUNT(*)) OVER (), 0), 1)::float AS percentage
    FROM change_requests
    WHERE department IS NOT NULL AND department != ''
    GROUP BY department
    ORDER BY count DESC
  `, { type: QueryTypes.SELECT });

  const computedSuccessRate = totalCRs > 0 ? `${Math.round((approvedCRs / totalCRs) * 100)}%` : metricsConfig?.successRate || '91.4%';

  const metrics = {
    ...metricsConfig,
    successRate: computedSuccessRate,
    emergencyRate: emergencyCRs > 0 ? `${emergencyCRs}` : metricsConfig?.emergencyRate || '3'
  };

  const monthlyData = monthlyVolume.map(({ month, count }) => ({ month, count }));
  const departmentData = departmentVolume.map(({ name, count, percentage }) => ({ name, count, percentage: Number(percentage) || 0 }));

  return { metrics, monthlyData, departmentData };
};

// ---------- Notifications -----------------------------

const getApproverUsers = async (tx) => {
  const users = await User.findAll({
    where: { status: 'Active' },
    include: [
      {
        model: Role,
        as: 'role',
        attributes: ['id', 'name'],
        where: { name: { [Op.in]: ['CAB Approver', 'Change Manager', 'Admin'] } }
      }
    ],
    transaction: tx
  });
  return users;
};

export const createSubmissionNotifications = async (changeRequest, tx) => {
  try {
    const approvers = await getApproverUsers(tx);
    const requesterName = changeRequest.employeeName || (await User.findByPk(changeRequest.requesterId, { transaction: tx }))?.name || 'an employee';

    const notifications = approvers
      .filter((a) => a.id !== changeRequest.requesterId)
      .map((a) => ({
        userId: a.id,
        changeRequestId: changeRequest.id,
        type: 'CR_SUBMITTED',
        title: 'New request waiting for approval',
        message: `New Change Request ${changeRequest.id} ('${changeRequest.title}') submitted by ${requesterName} is waiting for your approval.`,
        isRead: false,
        isStale: false
      }));
    if (notifications.length > 0) {
      await Notification.bulkCreate(notifications, { transaction: tx });
    }
  } catch (err) {
    console.error('[Notification] Failed to create submission notifications:', err.message);
  }
};

export const createWorklistActionNotifications = async (changeRequest, action, actorId, tx) => {
  try {
    const actor = await User.findByPk(actorId, { transaction: tx });
    const actorName = actor?.name || 'an approver';
    const requesterName = changeRequest.employeeName || (await User.findByPk(changeRequest.requesterId, { transaction: tx }))?.name || 'an employee';

    const verb = action === 'approve' ? 'Approved' : action === 'reject' ? 'Rejected' : 'Sent back';
    const type = action === 'approve' ? 'CR_APPROVED' : action === 'reject' ? 'CR_REJECTED' : 'CR_SENT_BACK';

    // 1. Notification for Requester
    if (changeRequest.requesterId) {
      await Notification.create(
        {
          userId: changeRequest.requesterId,
          changeRequestId: changeRequest.id,
          type,
          title: `Request ${verb} by ${actorName}`,
          message: `Your Change Request ${changeRequest.id} ('${changeRequest.title}') was ${verb.toLowerCase()} by ${actorName}.`,
          isRead: false,
          isStale: false
        },
        { transaction: tx }
      );
    }

    // 2. Notification for other CAB Approvers, Change Managers & Admins
    const approvers = await getApproverUsers(tx);
    const otherApprovers = approvers.filter((a) => a.id !== actorId && a.id !== changeRequest.requesterId);

    const peerNotifications = otherApprovers.map((a) => ({
      userId: a.id,
      changeRequestId: changeRequest.id,
      type: `PEER_${type}`,
      title: `Request ${verb} by ${actorName}`,
      message: `Change Request ${changeRequest.id} ('${changeRequest.title}') submitted by ${requesterName} was ${verb.toLowerCase()} by ${actorName}.`,
      isRead: false,
      isStale: true
    }));

    if (peerNotifications.length > 0) {
      await Notification.bulkCreate(peerNotifications, { transaction: tx });
    }

    // Mark previous "waiting for approval" notifications as stale
    await Notification.update(
      { isStale: true },
      {
        where: {
          changeRequestId: changeRequest.id,
          type: 'CR_SUBMITTED'
        },
        transaction: tx
      }
    );
  } catch (err) {
    console.error('[Notification] Failed to create worklist action notifications:', err.message);
  }
};

export const getUserNotificationsService = async (userId = 'usr-1') => {
  const rows = await Notification.findAll({
    where: { userId },
    order: [['createdAt', 'DESC']],
    limit: 25
  });

  const unreadCount = await Notification.count({ where: { userId, isRead: false } });

  return { data: rows.map((n) => n.get({ plain: true })), unreadCount };
};

export const markNotificationAsReadService = async (id, userId = 'usr-1') => {
  await Notification.update({ isRead: true }, { where: { id, userId } });
  return getUserNotificationsService(userId);
};

export const markAllNotificationsAsReadService = async (userId = 'usr-1') => {
  await Notification.update({ isRead: true }, { where: { userId, isRead: false } });
  return getUserNotificationsService(userId);
};
