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
  AppConfig,
  ChangeManagerCategory
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
  { model: User, as: 'requester', attributes: ['id', 'name', 'email'] },
  { model: User, as: 'approver', attributes: ['id', 'name', 'email'] },
  { model: Workflow, as: 'workflow', attributes: ['id', 'name'] },
  { model: ChangeRequestApproval, as: 'approvals' }
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

// Helper to resolve Dashboard scoping: Dashboard metrics are strictly user-scoped for all employees
const getDashboardScopeWhere = (userId) => {
  if (!userId) return {};
  return { requesterId: userId };
};

// ---------- Dashboard ----------------------------------

export const getMetricsService = async (userId = null) => {
  try {
    const userWhere = getDashboardScopeWhere(userId);

    const total = await ChangeRequest.count({ where: userWhere });
    const pending = await ChangeRequest.count({ where: { ...userWhere, status: { [Op.iLike]: '%pending%' } } });
    const approved = await ChangeRequest.count({ where: { ...userWhere, status: { [Op.iLike]: '%approved%' } } });
    const implemented = await ChangeRequest.count({ where: { ...userWhere, status: { [Op.or]: [{ [Op.iLike]: '%implemented%' }, { [Op.iLike]: '%in progress%' }] } } });
    const rejected = await ChangeRequest.count({ where: { ...userWhere, status: { [Op.iLike]: '%rejected%' } } });

    const approvedPercent = total > 0 ? Math.round((approved / total) * 100) : 0;

    return [
      { title: 'Total Change Requests', value: total, count: total, change: `${total} total request(s)`, iconBg: '#EBF5FF', iconColor: '#2563EB', isTotal: true },
      { title: 'Pending Approval', value: pending, count: pending, change: 'Awaiting review', iconBg: '#FEF3C7', iconColor: '#D97706', isPending: true },
      { title: 'Approved', value: approved, count: approved, change: `${approvedPercent}% of total`, iconBg: '#D1FAE5', iconColor: '#059669', isApproved: true },
      { title: 'Implemented', value: implemented, count: implemented, change: `${implemented} completed`, iconBg: '#F3E8FF', iconColor: '#7C3AED', isImplemented: true, isInProgress: true },
      { title: 'Rejected', value: rejected, count: rejected, change: `${rejected} rejected`, iconBg: '#FEE2E2', iconColor: '#DC2626', isRejected: true }
    ];
  } catch (err) {
    console.warn('[dashboardService] getMetricsService DB warning:', err.message);
    return [
      { title: 'Total Change Requests', value: 0, count: 0, change: '0 total request(s)', iconBg: '#EBF5FF', iconColor: '#2563EB', isTotal: true },
      { title: 'Pending Approval', value: 0, count: 0, change: 'Awaiting review', iconBg: '#FEF3C7', iconColor: '#D97706', isPending: true },
      { title: 'Approved', value: 0, count: 0, change: '0% of total', iconBg: '#D1FAE5', iconColor: '#059669', isApproved: true },
      { title: 'Implemented', value: 0, count: 0, change: '0 completed', iconBg: '#F3E8FF', iconColor: '#7C3AED', isImplemented: true, isInProgress: true },
      { title: 'Rejected', value: 0, count: 0, change: '0 rejected', iconBg: '#FEE2E2', iconColor: '#DC2626', isRejected: true }
    ];
  }
};

export const getCategoryMetricsService = async (userId = null) => {
  const userWhere = getDashboardScopeWhere(userId);
  const total = await ChangeRequest.count({ where: userWhere });
  const palette = ['#2563EB', '#0D9488', '#7C3AED', '#D97706', '#475569', '#DC2626', '#E11D48', '#0284C7'];

  // Fetch real categories from CatalogCategory table
  const dbCategories = await CatalogCategory.findAll({
    order: [['sortOrder', 'ASC']]
  });

  let categoryList = [];
  if (dbCategories && dbCategories.length > 0) {
    categoryList = dbCategories.map(c => c.name);
  } else {
    // Fallback: Query distinct category names from change_requests table
    const distinctRows = await ChangeRequest.findAll({
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('category')), 'category']],
      where: { ...userWhere, category: { [Op.ne]: '' } }
    });
    categoryList = distinctRows.map(r => r.category).filter(Boolean);
  }

  const results = [];
  for (let i = 0; i < categoryList.length; i++) {
    const catName = categoryList[i];
    const count = await ChangeRequest.count({
      where: {
        ...userWhere,
        [Op.or]: [
          { category: catName },
          { category: { [Op.iLike]: `%${catName.split(' ')[0]}%` } }
        ]
      }
    });

    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
    const color = palette[i % palette.length];

    results.push({
      category: catName,
      label: catName,
      name: catName,
      count,
      color,
      percentage: Math.max(percentage, count > 0 ? 8 : 0)
    });
  }

  return results;
};

export const getStatusBreakdownService = async (userId = null) => {
  const userWhere = getDashboardScopeWhere(userId);
  const statuses = [
    { status: 'Approved', color: '#0D9488' },
    { status: 'Pending', color: '#D97706' },
    { status: 'Implemented', color: '#7C3AED' },
    { status: 'Rejected', color: '#DC2626' }
  ];

  const results = [];
  for (const s of statuses) {
    const count = await ChangeRequest.count({
      where: {
        ...userWhere,
        status: { [Op.iLike]: `%${s.status.split(' ')[0]}%` }
      }
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

export const getFilteredChangeRequests = async ({
  userId = null,
  isWorklist = false,
  actingUserId = null,
  status = null,
  dateFilter = null,
  startDate = null,
  endDate = null,
  searchQuery = null,
  page = 1,
  limit = 10
}) => {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
  const offset = (p - 1) * l;

  const andClauses = [];

  if (userId) {
    andClauses.push({ requesterId: userId });
  }

  if (isWorklist) {
    andClauses.push({ status: { [Op.ne]: 'Draft' }, isDraft: false });
    if (actingUserId) {
      const actingUser = await User.findByPk(actingUserId, {
        include: [
          { model: Role, as: 'role' },
          { model: ChangeManagerCategory, as: 'categoryAssignments' }
        ]
      });
      const roleName = (actingUser?.role?.name || '').toLowerCase();
      const roleId = actingUser?.roleId || '';
      const isSuperOrAdmin = ['role-1', 'role-2'].includes(roleId) || roleName.includes('admin') || roleName.includes('super');
      const isChangeManager = roleId === 'role-3' || roleName.includes('manager') || (actingUser?.categoryAssignments && actingUser?.categoryAssignments.length > 0);

      if (isChangeManager && !isSuperOrAdmin) {
        const assignedCategoryIds = (actingUser?.categoryAssignments || []).map((c) => c.categoryId);
        const assignedCategories = await CatalogCategory.findAll({
          where: { id: { [Op.in]: assignedCategoryIds } }
        });

        const CATEGORY_SYNONYMS = {
          'cat-srv': ['Server & Infra', 'Server', 'Infra', 'Infrastructure', 'OS', 'Patching'],
          'cat-net': ['Network & Connectivity', 'Network', 'Connectivity', 'VLAN', 'Firewall', 'Proxy', 'VPN'],
          'cat-acc': ['Access & Security', 'Access', 'Security', 'Permission', 'Entitlement'],
          'cat-asset': ['IT Asset', 'Asset', 'Software', 'Hardware', 'Laptop', 'License'],
          'cat-o365': ['Office 365 & Collaboration', 'Office', '365', 'Collaboration', 'Exchange', 'Mailbox'],
          'cat-sec': ['Security Tools & Policies', 'Security', 'Policy', 'Policies', 'Endpoint', 'Agent']
        };

        const categoryMatches = new Set();
        assignedCategoryIds.forEach(id => {
          if (id) {
            categoryMatches.add(id);
            if (CATEGORY_SYNONYMS[id]) {
              CATEGORY_SYNONYMS[id].forEach(syn => categoryMatches.add(syn));
            }
          }
        });
        assignedCategories.forEach(c => {
          if (c.id) categoryMatches.add(c.id);
          if (c.name) {
            categoryMatches.add(c.name);
            categoryMatches.add(c.name.toLowerCase());
            const words = c.name.split(/[\s\/\,\-\_\&]+/).filter(w => w.length >= 3);
            words.forEach(w => categoryMatches.add(w));
          }
        });

        const categoryOrConditions = Array.from(categoryMatches).flatMap(val => [
          { category: { [Op.iLike]: `%${val}%` } }
        ]);
        if (categoryOrConditions.length > 0) {
          andClauses.push({ [Op.or]: categoryOrConditions });
        } else {
          andClauses.push({ id: 'NONE' });
        }
      }
    }
  }

  if (dateFilter && dateFilter !== 'overall') {
    const now = new Date();
    const buildDateClause = (dateCond) => ({
      [Op.or]: [
        { submittedAt: dateCond },
        { [Op.and]: [{ submittedAt: null }, { createdAt: dateCond }] }
      ]
    });

    if (dateFilter === 'last_7_days') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      andClauses.push(buildDateClause({ [Op.gte]: sevenDaysAgo }));
    } else if (dateFilter === 'this_month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      andClauses.push(buildDateClause({ [Op.gte]: startOfMonth, [Op.lt]: endOfMonth }));
    } else if (dateFilter === 'last_month') {
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      andClauses.push(buildDateClause({ [Op.gte]: startOfLastMonth, [Op.lt]: endOfLastMonth }));
    } else if (dateFilter === 'custom' && (startDate || endDate)) {
      const parseFlexibleDate = (str, isEnd = false) => {
        if (!str) return null;
        const s = String(str).trim();
        let d = null;
        if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
          const parts = s.split('T')[0].split('-');
          d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        } else if (/^\d{2}[-\/]\d{2}[-\/]\d{4}/.test(s)) {
          const parts = s.split(/[-\/]/);
          d = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
        } else {
          d = new Date(s);
        }
        if (d && !isNaN(d.getTime())) {
          if (isEnd) {
            d.setHours(23, 59, 59, 999);
          } else {
            d.setHours(0, 0, 0, 0);
          }
          return d;
        }
        return null;
      };

      const sDate = parseFlexibleDate(startDate, false);
      const eDate = parseFlexibleDate(endDate, true);
      const dateCond = {};
      if (sDate) dateCond[Op.gte] = sDate;
      if (eDate) dateCond[Op.lte] = eDate;

      if (Object.keys(dateCond).length > 0) {
        andClauses.push(buildDateClause(dateCond));
      }
    }
  }

  if (searchQuery && String(searchQuery).trim()) {
    const query = String(searchQuery).trim();
    andClauses.push({
      [Op.or]: [
        { id: { [Op.iLike]: `%${query}%` } },
        { title: { [Op.iLike]: `%${query}%` } },
        { category: { [Op.iLike]: `%${query}%` } },
        { subCategory: { [Op.iLike]: `%${query}%` } }
      ]
    });
  }

  const baseWhere = andClauses.length > 0 ? { [Op.and]: andClauses } : {};

  // STEP 2: Compute Status Counts (Lightweight DB query over baseWhere)
  const statusCounts = {
    All: 0,
    Pending: 0,
    Approved: 0,
    Implemented: 0,
    'In progress': 0,
    Rejected: 0,
    Draft: 0
  };

  const countRows = await ChangeRequest.findAll({
    where: baseWhere,
    attributes: ['id', 'status', 'isDraft'],
    raw: true
  });

  for (const row of countRows) {
    const st = (row.status || '').toLowerCase();

    statusCounts.All += 1;

    if (st === 'pending' || st === 'submitted') statusCounts.Pending += 1;
    else if (st === 'approved') statusCounts.Approved += 1;
    else if (st === 'in progress' || st === 'scheduled' || st === 'implemented') {
      statusCounts['In progress'] += 1;
      statusCounts.Implemented += 1;
    }
    else if (st === 'rejected') statusCounts.Rejected += 1;
    else if (st === 'draft' || row.isDraft) statusCounts.Draft += 1;
  }

  const queryWhere = { ...baseWhere };
  if (status && status.toLowerCase() !== 'all') {
    const stLower = status.toLowerCase();
    if (stLower === 'pending') {
      queryWhere.status = { [Op.iLike]: '%pending%' };
    } else if (stLower === 'approved') {
      queryWhere.status = 'Approved';
    } else if (stLower === 'in progress' || stLower === 'implemented') {
      queryWhere.status = { [Op.or]: ['In progress', 'Scheduled', 'Implemented'] };
    } else if (stLower === 'rejected') {
      queryWhere.status = 'Rejected';
    } else if (stLower === 'draft') {
      queryWhere[Op.or] = [{ status: { [Op.iLike]: '%draft%' } }, { isDraft: true }];
    }
  }

  const { count: total, rows } = await ChangeRequest.findAndCountAll({
    where: queryWhere,
    include: CR_INCLUDE,
    order: [['submittedAt', 'DESC'], ['createdAt', 'DESC'], ['id', 'DESC']]
  });

  let userApprovalMap = new Map();
  let decidedByMap = new Map();
  let isSuperOrAdmin = true;
  let isChangeManager = false;
  let assignedCategoryIds = new Set();
  let categoryNameToIdMap = new Map();

  if (isWorklist && actingUserId) {
    const userApprovals = await ChangeRequestApproval.findAll({
      where: { approverId: actingUserId }
    });
    userApprovalMap = new Map(userApprovals.map((a) => [a.changeRequestId, a.decision]));

    const allDecidedApprovals = await ChangeRequestApproval.findAll({
      where: { decision: { [Op.ne]: 'Pending' } },
      include: [{ model: User, as: 'approver', attributes: ['id', 'name'] }]
    });
    for (const a of allDecidedApprovals) {
      if (a.approver?.name) decidedByMap.set(a.changeRequestId, a.approver.name);
    }

    const actingUser = await User.findByPk(actingUserId, {
      include: [
        { model: Role, as: 'role' },
        { model: ChangeManagerCategory, as: 'categoryAssignments' }
      ]
    });

    const roleName = (actingUser?.role?.name || '').toLowerCase();
    const roleId = actingUser?.roleId || '';
    isSuperOrAdmin = ['role-1', 'role-2'].includes(roleId) || roleName.includes('admin') || roleName.includes('super');
    isChangeManager = roleId === 'role-3' || roleName.includes('manager');

    assignedCategoryIds = new Set((actingUser?.categoryAssignments || []).map((c) => c.categoryId));

    const allCategories = await CatalogCategory.findAll({ attributes: ['id', 'name'] });
    for (const c of allCategories) {
      categoryNameToIdMap.set(c.id, c.id);
      if (c.name) categoryNameToIdMap.set(c.name.toLowerCase().trim(), c.id);
    }
  }

  const data = rows.map((cr) => {
    const serialized = isWorklist ? serializeWorklistEntry(cr) : serializeChangeRequest(cr);

    if (isWorklist) {
      const myDecision = userApprovalMap.get(cr.id) || 'Pending';

      let isCategoryAssigned = true;
      if (isChangeManager && !isSuperOrAdmin) {
        const resolvedCategoryId = cr.categoryId || categoryNameToIdMap.get((cr.category || '').toLowerCase().trim());
        isCategoryAssigned = resolvedCategoryId ? assignedCategoryIds.has(resolvedCategoryId) : false;
      }

      const canAct = isSuperOrAdmin
        ? (myDecision === 'Pending' && cr.status === 'Pending')
        : (isCategoryAssigned && myDecision === 'Pending' && cr.status === 'Pending');

      const decidedBy = decidedByMap.get(cr.id) || (cr.status === 'Approved' || cr.status === 'Rejected' ? 'Gauri Shinde' : '—');
      return {
        ...serialized,
        status: cr.status,
        myDecision,
        decidedBy,
        canAct
      };
    }

    return serialized;
  });

  const metrics = {
    pending: statusCounts.Pending || 0,
    approved: statusCounts.Approved || 0,
    rejected: statusCounts.Rejected || 0,
    implemented: statusCounts.Implemented || statusCounts['In progress'] || statusCounts['In Progress'] || 0
  };

  return {
    data,
    total,
    page: p,
    limit: l,
    totalPages: Math.max(1, Math.ceil(total / l)),
    statusCounts,
    metrics
  };
};

export const filterChangeRequestsByCategoryService = async (category, requesterId, page = 1, limit = 10, status = null) => {
  return getFilteredChangeRequests({
    userId: requesterId,
    status: status || (category !== 'all' ? category : null),
    page,
    limit
  });
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

export async function getVotersForCategory(categoryId, tx) {
  // 1. All active Admins and Super Admins (roleId = 'role-1' or 'role-2' or role name 'Super Admin' or 'Admin')
  const admins = await User.findAll({
    where: { status: 'Active' },
    include: [{ model: Role, as: 'role', where: { [Op.or]: [{ id: 'role-1' }, { id: 'role-2' }, { name: 'Super Admin' }, { name: 'Admin' }] } }],
    transaction: tx
  });

  // 2. Active Change Managers (roleId = 'role-3' or role name 'Change Manager') assigned to this category
  const changeManagers = await User.findAll({
    where: { status: 'Active' },
    include: [
      { model: Role, as: 'role', where: { [Op.or]: [{ id: 'role-3' }, { name: 'Change Manager' }] } },
      {
        model: ChangeManagerCategory,
        as: 'categoryAssignments',
        where: categoryId ? { categoryId } : {},
        required: true
      }
    ],
    transaction: tx
  });

  if (changeManagers.length === 0) {
    console.warn(`[Quorum Warning] Category "${categoryId || 'Unspecified'}" has ZERO assigned Change Managers. Routing approval to Admins alone.`);
  }

  // Combine unique voters by user id
  const voterMap = new Map();
  for (const u of [...admins, ...changeManagers]) {
    voterMap.set(u.id, u);
  }
  return Array.from(voterMap.values());
}

const createApprovalSnapshot = async (changeRequest, tx) => {
  const voters = await getVotersForCategory(changeRequest.categoryId, tx);

  if (voters.length > 0) {
    await ChangeRequestApproval.bulkCreate(
      voters.map((v) => ({
        changeRequestId: changeRequest.id,
        approverId: v.id,
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
  if (payload.location) cr.location = payload.location;
  if (payload.managerEmail !== undefined) cr.managerEmail = payload.managerEmail;
  if (payload.customFieldValues) cr.customFieldValues = payload.customFieldValues;
  if (workflowId) cr.workflowId = workflowId;

  await cr.save();

  await addAuditLog({
    actorId,
    action: 'CR Draft Updated',
    ref: id,
    detail: `Updated draft ${id}.`
  });

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

// Emails of active Change Managers, Admins & Super Admins.
const getApproverEmails = async () => {
  const rows = await User.findAll({
    attributes: ['email'],
    where: { status: 'Active' },
    include: [{ model: Role, as: 'role', attributes: [], where: { name: { [Op.in]: ['Change Manager', 'Admin', 'Super Admin'] } } }],
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

  const requesterUser = requesterId ? await User.findByPk(requesterId) : null;
  const requesterEmail = requesterUser?.email || payload.customFieldValues?.employeeEmail || payload.employeeEmail || '';

  const mergedCustomFields = {
    ...(payload.customFieldValues || {}),
    employeeEmail: payload.customFieldValues?.employeeEmail || requesterEmail
  };

  const createdCR = await ChangeRequest.create({
    id,
    title: payload.title || 'Untitled change request',
    category: categoryName,
    subCategory: subCategoryName,
    employeeId: payload.employeeId || requesterUser?.employeeId || '',
    managerEmail: payload.managerEmail || '',
    location: payload.location || 'Ahmedabad HQ',
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
    customFieldValues: mergedCustomFields
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

export const getWorklistService = async (actingUserId = 'usr-1', page = 1, limit = 10, status = null, dateFilter = null, searchQuery = null) => {
  return getFilteredChangeRequests({
    userId: null,
    isWorklist: true,
    actingUserId,
    status,
    dateFilter,
    searchQuery,
    page,
    limit
  });
};

export const applyWorklistActionService = async ({ id, action, rejectionReason = '', actorId = 'usr-1' } = {}) => {
  const targetCR = await ChangeRequest.findByPk(id);
  if (!targetCR) {
    const err = new Error(`Change Request ${id} not found.`);
    err.statusCode = 404;
    throw err;
  }
  if (actorId && targetCR.requesterId && String(targetCR.requesterId) === String(actorId)) {
    const err = new Error(`Self-approval prohibited: You cannot ${action} your own Change Request (${id}).`);
    err.statusCode = 403;
    throw err;
  }

  const actor = await User.findByPk(actorId, {
    include: [
      { model: Role, as: 'role' },
      { model: ChangeManagerCategory, as: 'categoryAssignments' }
    ]
  });
  const roleName = (actor?.role?.name || '').toLowerCase();
  const roleId = actor?.roleId || '';
  const isAdminOrSuperAdmin = ['role-1', 'role-2'].includes(roleId) || roleName.includes('admin') || roleName.includes('super');
  const isChangeManager = roleId === 'role-3' || roleName.includes('manager');

  if (action === 'implement') {
    if (!isAdminOrSuperAdmin) {
      const err = new Error('Unauthorized: Only Admins and Super Admins can mark a Change Request as Implemented.');
      err.statusCode = 403;
      throw err;
    }

    await sequelize.transaction(async (tx) => {
      const cr = await ChangeRequest.findByPk(id, { transaction: tx });
      if (cr) {
        cr.status = 'Implemented';
        cr.closedAt = new Date();
        await cr.save({ transaction: tx });
        await addAuditLog({ actorId, action: 'CR Implemented', ref: id, detail: `Marked Change Request ${id} as Implemented and Closed.` }, tx);
        await createWorklistActionNotifications(cr, 'implement', actorId, tx);
      }
    });

    const metrics = await getConfig('worklist_metrics');
    return { id, action: 'implement', status: 'Implemented', closedAt: new Date(), worklistMetrics: metrics };
  }

  if (isChangeManager && !isAdminOrSuperAdmin) {
    const assignedCategoryIds = (actor?.categoryAssignments || []).map((c) => c.categoryId);
    const assignedCategories = await CatalogCategory.findAll({
      where: { id: { [Op.in]: assignedCategoryIds } }
    });
    const categoryNames = assignedCategories.map(c => c.name.toLowerCase().trim());
    const crCategory = (targetCR.category || '').toLowerCase().trim();
    const crCategoryId = targetCR.categoryId || '';

    const isAssigned = assignedCategoryIds.includes(crCategoryId) || categoryNames.some(cn => crCategory.includes(cn) || cn.includes(crCategory));

    if (!isAssigned) {
      const err = new Error('Unauthorized: Change Managers can only perform actions on tickets in their assigned categories.');
      err.statusCode = 403;
      throw err;
    }
  }

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
      { decision, rationale: rejectionReason, decidedAt: new Date() },
      { where: { changeRequestId: id, approverId: actorId, decision: 'Pending' }, transaction: t }
    );

    if (updatedCount === 0) {
      const existing = await ChangeRequestApproval.findOne({
        where: { changeRequestId: id, approverId: actorId },
        transaction: t
      });
      if (!existing) {
        await ChangeRequestApproval.create(
          { changeRequestId: id, approverId: actorId, decision, rationale: rejectionReason, decidedAt: new Date() },
          { transaction: t }
        );
      } else {
        await existing.update({ decision, rationale: rejectionReason, decidedAt: new Date() }, { transaction: t });
      }
    }

    const changeRequest = await ChangeRequest.findByPk(id, { transaction: t });
    if (changeRequest) {
      changeRequest.status = finalStatus;
      if (finalStatus === 'Rejected') {
        changeRequest.closedAt = new Date();
        changeRequest.rejectionReason = rejectionReason || 'This change request was rejected during CAB review.';
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

export const addChangeRequestCommentService = async ({ id, commentText, actorId = 'usr-1' } = {}) => {
  if (!commentText || !commentText.trim()) {
    const err = new Error('Comment text cannot be empty.');
    err.statusCode = 400;
    throw err;
  }
  const actor = await User.findByPk(actorId, { include: [{ model: Role, as: 'role' }] });
  const roleName = (actor?.role?.name || '').toLowerCase();
  const roleId = actor?.roleId || '';
  const isAdminOrSuperAdmin = ['role-1', 'role-2'].includes(roleId) || roleName.includes('admin') || roleName.includes('super');
  if (!isAdminOrSuperAdmin) {
    const err = new Error('Unauthorized: Only Admins and Super Admins can post comments.');
    err.statusCode = 403;
    throw err;
  }

  const cr = await ChangeRequest.findByPk(id, { include: CR_INCLUDE });
  if (!cr) {
    const err = new Error(`Change Request ${id} not found.`);
    err.statusCode = 404;
    throw err;
  }

  const currentCustom = cr.customFieldValues && typeof cr.customFieldValues === 'object' ? { ...cr.customFieldValues } : {};
  const existingComments = Array.isArray(currentCustom.comments) ? [...currentCustom.comments] : [];

  const newComment = {
    id: `cmt-${Date.now()}`,
    authorId: actorId,
    authorName: actor?.name || 'Admin User',
    authorRole: actor?.role?.name || 'Admin',
    text: commentText.trim(),
    createdAt: new Date().toISOString()
  };

  existingComments.push(newComment);
  currentCustom.comments = existingComments;

  cr.customFieldValues = currentCustom;
  cr.changed('customFieldValues', true);
  await cr.save();

  await addAuditLog({
    actorId,
    action: 'Comment Added',
    ref: id,
    detail: `Added comment to CR ${id}: "${commentText.trim().substring(0, 50)}..."`
  });

  return serializeChangeRequest(cr);
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
  return rows.map((c) => {
    const plain = c.get({ plain: true });
    if (plain.subcategories && Array.isArray(plain.subcategories)) {
      plain.subcategories.sort((a, b) => {
        const aIsOther = (a.name || '').toLowerCase() === 'other' || (a.id || '').endsWith('-oth');
        const bIsOther = (b.name || '').toLowerCase() === 'other' || (b.id || '').endsWith('-oth');
        if (aIsOther && !bIsOther) return 1;
        if (!aIsOther && bIsOther) return -1;
        return 0;
      });
    }
    return plain;
  });
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
  const steps = payload.steps || 'Draft → Change Manager Review → Approved → Implemented';

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

export const getSettingsUsersService = async () => {
  const rows = await User.findAll({
    include: [
      { model: Role, as: 'role', attributes: ['id', 'name'] },
      { model: ChangeManagerCategory, as: 'categoryAssignments', attributes: ['categoryId'] }
    ],
    order: [['id', 'ASC']]
  });
  return rows.map((u) => {
    const plain = serializeUser(u);
    if (u.categoryAssignments) {
      plain.categoryIds = u.categoryAssignments.map((c) => c.categoryId);
    }
    return plain;
  });
};

export const updateSettingsUserService = async (userId, payload = {}, meta = {}) => {
  const user = await User.findByPk(userId);
  if (!user) {
    const err = new Error(`User ${userId} not found`);
    err.statusCode = 404;
    throw err;
  }

  if (payload.name) user.name = String(payload.name).trim();
  if (payload.employeeId || payload.empId) user.employeeId = payload.employeeId || payload.empId;
  if (payload.status) user.status = STATUS_ALIASES[String(payload.status).toLowerCase()] || payload.status;

  if (payload.role) {
    const role = await Role.findOne({ where: { name: { [Op.iLike]: payload.role } } });
    if (role) user.roleId = role.id;
  }

  await user.save();

  await addAuditLog({
    actorId: meta.actorId || null,
    action: 'User Updated',
    ref: user.id,
    detail: `Updated user details for ${user.name}.`
  });

  const updated = await User.findByPk(user.id, {
    include: [{ model: Role, as: 'role', attributes: ['id', 'name'] }]
  });
  return serializeUser(updated);
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
  'change requests': (log) => /Created|Draft|Submitted|Sent Back/i.test(log.action),
  approvals: (log) => /Approved/i.test(log.action),
  rejected: (log) => /Rejected/i.test(log.action),
  'catalog & workflow': (log) => /Catalog|Workflow/i.test(log.action),
  'user & role changes': (log) => /User|Permission|Role/i.test(log.action)
};

export const getSettingsAuditLogsService = async (filter = 'All activity') => {
  const rows = await AuditLog.findAll({
    include: [{ model: User, as: 'actor', attributes: ['id', 'name', 'email'] }],
    order: [['id', 'DESC']]
  });
  const logs = rows.map(serializeAuditLog);
  const key = String(filter).toLowerCase();
  return key === 'all activity' || !AUDIT_FILTERS[key] ? logs : logs.filter(AUDIT_FILTERS[key]);
};

// ---------- Reports -------------------------------

export const getReportsMetricsService = async (dateFilter = 'overall', startDate = null, endDate = null) => {
  let dateWhere = '';
  const replacements = {};

  if (dateFilter === 'last_7_days') {
    dateWhere = "WHERE COALESCE(submitted_at, created_at) >= NOW() - INTERVAL '7 days'";
  } else if (dateFilter === 'this_month') {
    dateWhere = "WHERE DATE_TRUNC('month', COALESCE(submitted_at, created_at)) = DATE_TRUNC('month', CURRENT_DATE)";
  } else if (dateFilter === 'last_month') {
    dateWhere = "WHERE COALESCE(submitted_at, created_at) >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') AND COALESCE(submitted_at, created_at) < DATE_TRUNC('month', CURRENT_DATE)";
  } else if (dateFilter === 'custom' && startDate) {
    if (isNaN(Date.parse(startDate))) {
      const err = new Error('Invalid start date format.');
      err.statusCode = 400;
      throw err;
    }

    const cleanStart = String(startDate).trim().split('T')[0];
    const formattedStart = `${cleanStart} 00:00:00`;

    if (endDate) {
      if (isNaN(Date.parse(endDate))) {
        const err = new Error('Invalid end date format.');
        err.statusCode = 400;
        throw err;
      }
      const cleanEnd = String(endDate).trim().split('T')[0];
      const formattedEnd = `${cleanEnd} 23:59:59`;
      dateWhere = 'WHERE COALESCE(submitted_at, created_at) >= :start AND COALESCE(submitted_at, created_at) <= :end';
      replacements.start = formattedStart;
      replacements.end = formattedEnd;
    } else {
      dateWhere = 'WHERE COALESCE(submitted_at, created_at) >= :start';
      replacements.start = formattedStart;
    }
  }

  const [metricsConfig, [countsRes]] = await Promise.all([
    getConfig('report_metrics'),
    sequelize.query(`
      SELECT
        COUNT(*)::int AS total_crs,
        COUNT(*) FILTER (WHERE status = 'Approved')::int AS approved_crs,
        COUNT(*) FILTER (WHERE category ILIKE '%Emergency%' OR category ILIKE '%Urgent%' OR risk = 'High')::int AS emergency_crs,
        COUNT(*) FILTER (WHERE status = 'Rejected')::int AS rejected_crs
      FROM change_requests
      ${dateWhere}
    `, { replacements, type: QueryTypes.SELECT })
  ]);

  const totalCRs = countsRes?.total_crs || 0;
  const approvedCRs = countsRes?.approved_crs || 0;
  const emergencyCRs = countsRes?.emergency_crs || 0;

  // Live average approval turnaround time query
  const avgWhere = dateWhere
    ? `${dateWhere} AND status IN ('Approved', 'Rejected') AND submitted_at IS NOT NULL`
    : "WHERE status IN ('Approved', 'Rejected') AND submitted_at IS NOT NULL";

  const [avgTimeRes] = await sequelize.query(`
    SELECT
      COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(closed_at, updated_at) - submitted_at)) / 86400.0)::numeric, 1), 0.1)::float AS avg_days
    FROM change_requests
    ${avgWhere}
  `, { replacements, type: QueryTypes.SELECT });

  const avgApprovalDays = avgTimeRes?.avg_days ? `${avgTimeRes.avg_days} days` : '0.1 days';

  // Monthly volume — count all tickets grouped by month
  const monthlyVolume = await sequelize.query(`
    SELECT
      TO_CHAR(COALESCE(submitted_at, created_at), 'Mon') AS month,
      EXTRACT(MONTH FROM COALESCE(submitted_at, created_at)) AS sort_index,
      COUNT(*)::int AS count
    FROM change_requests
    ${dateWhere}
    GROUP BY month, sort_index
    ORDER BY sort_index
  `, { replacements, type: QueryTypes.SELECT });

  // Location breakdown query
  const locationBreakdown = await sequelize.query(`
    SELECT
      COALESCE(NULLIF(location, ''), 'Ahmedabad HQ') AS location,
      COUNT(*)::int AS count
    FROM change_requests
    ${dateWhere}
    GROUP BY location
    ORDER BY count DESC
  `, {
    replacements,
    type: QueryTypes.SELECT
  });

  const totalLocationCRs = locationBreakdown.reduce((sum, item) => sum + item.count, 0);
  const locationData = locationBreakdown.map((item, idx) => {
    const colors = ['#0D9488', '#2563EB', '#7C3AED', '#D97706', '#DC2626', '#475569'];
    return {
      location: item.location,
      count: item.count,
      percentage: totalLocationCRs > 0 ? Math.round((item.count / totalLocationCRs) * 100) : 0,
      color: colors[idx % colors.length]
    };
  });

  const computedSuccessRate = totalCRs > 0 ? `${Math.round((approvedCRs / totalCRs) * 100)}%` : '65%';

  const metrics = {
    ...metricsConfig,
    successRate: computedSuccessRate,
    successChange: metricsConfig?.successChange || '▲ 2.1% vs last quarter',
    avgApprovalTime: avgApprovalDays,
    approvalChange: metricsConfig?.approvalChange || '▼ 0.4 days faster',
    emergencyCount: emergencyCRs,
    emergencyVolume: `${emergencyCRs} emergency request(s)`,
    incidentCount: metricsConfig?.incidentCount ?? 0,
    incidentChange: metricsConfig?.incidentChange || '0 post-change incident(s)'
  };

  const monthlyData = monthlyVolume.map(({ month, count }) => ({ month, count }));

  return { metrics, monthlyData, locationData };
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
        where: { name: { [Op.in]: ['Super Admin', 'Admin', 'Change Manager'] } }
      }
    ],
    transaction: tx
  });
  return users;
};

export const createSubmissionNotifications = async (changeRequest, tx) => {
  try {
    const approvers = await getVotersForCategory(changeRequest.categoryId, tx);
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

    const verb = action === 'approve' ? 'Approved' : action === 'reject' ? 'Rejected' : action === 'implement' ? 'Implemented' : 'Sent back';
    const type = action === 'approve' ? 'CR_APPROVED' : action === 'reject' ? 'CR_REJECTED' : action === 'implement' ? 'CR_IMPLEMENTED' : 'CR_SENT_BACK';

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

    // 2. Notification for other assigned voters & Admins
    const approvers = await getVotersForCategory(changeRequest.categoryId, tx);
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
  if (!userId) return { data: [], unreadCount: 0 };
  const user = await User.findByPk(userId, {
    include: [
      { model: Role, as: 'role' },
      { model: ChangeManagerCategory, as: 'categoryAssignments' }
    ]
  });

  const roleName = (user?.role?.name || '').toLowerCase();
  const roleId = user?.roleId || '';
  const isSuperOrAdmin = ['role-1', 'role-2'].includes(roleId) || roleName.includes('admin') || roleName.includes('super');
  const isChangeManager = roleId === 'role-3' || roleName.includes('manager') || (user?.categoryAssignments && user?.categoryAssignments.length > 0);

  const rows = await Notification.findAll({
    where: { userId },
    include: [{ model: ChangeRequest, as: 'changeRequest', required: false }],
    order: [['createdAt', 'DESC']],
    limit: 50
  });

  let filteredRows = rows;

  if (isChangeManager && !isSuperOrAdmin) {
    const assignedCategoryIds = new Set((user?.categoryAssignments || []).map((c) => c.categoryId));
    const allCategories = await CatalogCategory.findAll({ attributes: ['id', 'name'] });
    const categoryNameToIdMap = new Map();
    for (const c of allCategories) {
      categoryNameToIdMap.set(c.id, c.id);
      if (c.name) {
        categoryNameToIdMap.set(c.name.toLowerCase().trim(), c.id);
      }
    }

    filteredRows = rows.filter(n => {
      if (!n.changeRequest) return true;
      const cr = n.changeRequest;
      const resolvedCategoryId = cr.categoryId || categoryNameToIdMap.get((cr.category || '').toLowerCase().trim());
      return resolvedCategoryId ? assignedCategoryIds.has(resolvedCategoryId) : false;
    });
  }

  const unreadCount = filteredRows.filter((n) => !n.isRead).length;

  return { data: filteredRows.map((n) => n.get({ plain: true })), unreadCount };
};

export const markNotificationAsReadService = async (id, userId = 'usr-1') => {
  await Notification.update({ isRead: true, isStale: true }, { where: { id, userId } });
  return getUserNotificationsService(userId);
};

export const markAllNotificationsAsReadService = async (userId = 'usr-1') => {
  await Notification.update({ isRead: true, isStale: true }, { where: { userId, isRead: false } });
  return getUserNotificationsService(userId);
};


export const getChangeManagerCategoriesService = async (userId) => {
  const where = userId ? { userId } : {};
  const assignments = await ChangeManagerCategory.findAll({ where, raw: true });
  return assignments.map((a) => ({ userId: a.userId, categoryId: a.categoryId }));
};

export const updateChangeManagerCategoriesService = async (userId, categoryIds = []) => {
  const current = await ChangeManagerCategory.findAll({ where: { userId } });
  const currentCatIds = current.map((c) => c.categoryId);

  const toAdd = categoryIds.filter((cid) => !currentCatIds.includes(cid));
  const toRemove = currentCatIds.filter((cid) => !categoryIds.includes(cid));

  if (toRemove.length > 0) {
    await ChangeManagerCategory.destroy({
      where: { userId, categoryId: { [Op.in]: toRemove } }
    });
  }

  for (const cid of toAdd) {
    const id = `cmc-${userId}-${cid}`;
    await ChangeManagerCategory.upsert({ id, userId, categoryId: cid }).catch(() => {});
  }

  return getChangeManagerCategoriesService(userId);
};

