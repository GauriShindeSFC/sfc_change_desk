// ────────────────────────────────────────────────────────────────
//  Service layer – all reads/writes go through Sequelize models and
//  their relationships. Returns data shaped exactly as the frontend
//  consumes it (see ../utils/serializers.js).
// ────────────────────────────────────────────────────────────────
import { Op, QueryTypes, fn, col } from 'sequelize';
import {
  sequelize,
  Role,
  Workflow,
  CatalogCategory,
  CatalogSubcategory,
  CatalogSubcategoryField,
  ChangeRequest,
  ChangeRequestApproval,
  AuditLog,
  AppConfig,
  ChangeManagerCategory,
  ChangeImplementerCategory
} from '../models/index.js';
import { Employee } from '../models/Employee.js';
import { UserAppRole } from '../models/UserAppRole.js';
import { UserS8 } from '../models/UserS8.js';
import { IdentityResolver, resolveDualSourceIdentities, resolveEmailForUser } from './identityResolver.service.js';
import bcrypt from 'bcryptjs';
import { formatTimestamp } from '../data/store.js';
import { generateTempPassword, checkUserInUserTable } from './auth.service.js';
import { sendChangeRequestCreatedEmail, sendUserInviteEmail } from './mail.service.js';
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

// Helper to resolve Dashboard scoping: Dashboard metrics are strictly user-scoped for all employees (matching My Requests ownership)
const getDashboardScopeWhere = async (userId) => {
  if (!userId) return {};
  return { requesterId: userId };
};

import { buildDateFilterClause } from '../utils/dateFilterUtils.js';

export { buildDateFilterClause };

// ---------- Dashboard ----------------------------------

export const getMetricsService = async (userId = null, { dateFilter = null, startDate = null, endDate = null, status = null, searchQuery = null } = {}) => {
  try {
    const userWhere = await getDashboardScopeWhere(userId);
    const dateClause = buildDateFilterClause(dateFilter, startDate, endDate);
    const andClauses = [
      {
        isDraft: false,
        status: { [Op.notIn]: ['Draft', 'draft', 'Deleted', 'deleted', 'Cancelled', 'cancelled'] }
      }
    ];
    if (userWhere && Object.keys(userWhere).length > 0) andClauses.push(userWhere);
    if (dateClause) andClauses.push(dateClause);

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

    const activeWhere = { [Op.and]: andClauses };

    // One grouped query replaces five counts on every dashboard refresh.
    const grouped = await ChangeRequest.findAll({
      where: activeWhere,
      attributes: ['status', [fn('COUNT', col('id')), 'count']],
      group: ['status'],
      raw: true
    });
    const counts = grouped.reduce((map, row) => {
      map[String(row.status || '').toLowerCase()] = Number(row.count) || 0;
      return map;
    }, {});
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    const pending = (counts.pending || 0) + (counts.open || 0) + (counts.submitted || 0);
    const approved = counts.approved || 0;
    const implemented = (counts.implemented || 0) + (counts['in progress'] || 0) + (counts.scheduled || 0);
    const rejected = counts.rejected || 0;

    // Filter contract: Under Implemented, Rejected, or Pending filter tabs, Approved is 0.
    const statusNormalized = String(status || '').toLowerCase().trim();
    const approvedMetric = (statusNormalized && !['all', 'approved'].includes(statusNormalized))
      ? 0
      : approved;

    return [
      { title: 'Total Change Requests', value: total, count: total, change: 'Total Requests', iconBg: '#EBF5FF', iconColor: '#2563EB', isTotal: true },
      { title: 'Pending Approvals', value: pending, count: pending, change: 'Awaiting review', iconBg: '#FEF3C7', iconColor: '#D97706', isPending: true },
      { id: 'approved', title: 'Approved', value: approvedMetric, count: approvedMetric, change: 'Approved', iconBg: '#ECFDF5', iconColor: '#059669', isApproved: true },
      { title: 'Implemented', value: implemented, count: implemented, change: 'Implemented', iconBg: '#F3E8FF', iconColor: '#7C3AED', isImplemented: true, isInProgress: true },
      { title: 'Rejected', value: rejected, count: rejected, change: 'Rejected', iconBg: '#FEE2E2', iconColor: '#DC2626', isRejected: true }
    ];
  } catch (err) {
    console.warn('[dashboardService] getMetricsService DB warning:', err.message);
    return [
      { title: 'Total Change Requests', value: 0, count: 0, change: 'Total Requests', iconBg: '#EBF5FF', iconColor: '#2563EB', isTotal: true },
      { title: 'Pending Approvals', value: 0, count: 0, change: 'Awaiting review', iconBg: '#FEF3C7', iconColor: '#D97706', isPending: true },
      { id: 'approved', title: 'Approved', value: 0, count: 0, change: 'Approved', iconBg: '#ECFDF5', iconColor: '#059669', isApproved: true },
      { title: 'Implemented', value: 0, count: 0, change: 'Implemented', iconBg: '#F3E8FF', iconColor: '#7C3AED', isImplemented: true, isInProgress: true },
      { title: 'Rejected', value: 0, count: 0, change: 'Rejected', iconBg: '#FEE2E2', iconColor: '#DC2626', isRejected: true }
    ];
  }
};

export const getCategoryMetricsService = async (userId = null, { dateFilter = null, startDate = null, endDate = null } = {}) => {
  const userWhere = await getDashboardScopeWhere(userId);
  const dateClause = buildDateFilterClause(dateFilter, startDate, endDate);
  const palette = ['#D97706', '#475569', '#7C3AED', '#0D9488', '#DC2626', '#2563EB'];

  // Canonical categories list in exact user-specified order
  const CANONICAL_CATEGORIES = [
    { id: 'cat-asset', name: 'IT Asset', color: '#D97706' },
    { id: 'cat-o365', name: 'Office 365 & Collaboration', color: '#475569' },
    { id: 'cat-acc', name: 'Access & Security', color: '#7C3AED' },
    { id: 'cat-net', name: 'Network & Connectivity', color: '#0D9488' },
    { id: 'cat-sec', name: 'Security Tools & Policies', color: '#DC2626' },
    { id: 'cat-srv', name: 'Server & Infra', color: '#2563EB' }
  ];

  // Base exclusion: strictly exclude drafts, deleted, and cancelled tickets
  const andClauses = [
    {
      isDraft: false,
      status: { [Op.notIn]: ['Draft', 'draft', 'Deleted', 'deleted', 'Cancelled', 'cancelled'] }
    }
  ];
  if (userWhere && Object.keys(userWhere).length > 0) andClauses.push(userWhere);
  if (dateClause) andClauses.push(dateClause);

  const activeWhere = { [Op.and]: andClauses };

  const grouped = await ChangeRequest.findAll({
    where: activeWhere,
    attributes: ['category', [fn('COUNT', col('id')), 'count']],
    group: ['category'],
    raw: true
  });
  const categoryCounts = new Map(grouped.map((row) => [String(row.category || '').toLowerCase(), Number(row.count) || 0]));
  const results = CANONICAL_CATEGORIES.map((cat, index) => ({
    categoryId: cat.id,
    category: cat.name,
    label: cat.name,
    name: cat.name,
    count: (categoryCounts.get(cat.name.toLowerCase()) || 0) + (categoryCounts.get(cat.id.toLowerCase()) || 0),
    color: cat.color || palette[index % palette.length],
    percentage: 0
  }));
  const totalCount = results.reduce((sum, item) => sum + item.count, 0);

  // Calculate actual percentages strictly based on totalCount of actual tickets
  for (const item of results) {
    item.percentage = (item.count > 0 && totalCount > 0)
      ? Math.round((item.count / totalCount) * 100)
      : 0;
  }

  return results;
};

export const getStatusBreakdownService = async (userId = null, { dateFilter = null, startDate = null, endDate = null } = {}) => {
  const userWhere = await getDashboardScopeWhere(userId);
  const dateClause = buildDateFilterClause(dateFilter, startDate, endDate);
  const statuses = [
    { status: 'Pending', label: 'Pending Approvals', color: '#D97706' },
    { status: 'Approved', label: 'Approved', color: '#059669' },
    { status: 'Implemented', label: 'Implemented', color: '#7C3AED' },
    { status: 'Rejected', label: 'Rejected', color: '#DC2626' }
  ];

  const andClauses = [];
  if (userWhere && Object.keys(userWhere).length > 0) andClauses.push(userWhere);
  if (dateClause) andClauses.push(dateClause);
  const activeWhere = andClauses.length > 0 ? { [Op.and]: andClauses } : {};

  const grouped = await ChangeRequest.findAll({
    where: activeWhere,
    attributes: ['status', 'isDraft', [fn('COUNT', col('id')), 'count']],
    group: ['status', 'isDraft'],
    raw: true
  });
  const countFor = (names) => grouped.reduce((sum, row) => (
    names.includes(String(row.status || '').toLowerCase()) ? sum + (Number(row.count) || 0) : sum
  ), 0);
  return statuses.map((s) => ({
    status: s.status,
    label: s.label || s.status,
    count: countFor(s.status === 'Pending' ? ['pending', 'submitted'] : s.status === 'Approved' ? ['approved'] : s.status === 'Implemented' ? ['implemented', 'in progress', 'scheduled'] : [s.status.toLowerCase()]),
    color: s.color
  }));
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
  organizationScope = false,
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
      const identityRes = await IdentityResolver.resolveByKey(actingUserId);
      const identity = identityRes.status === 'SUCCESS' ? identityRes.identity : null;
      const roleId = identity?.roleId || null;
      const roleName = String(identity?.role || '').toLowerCase();
      const isSuperOrAdmin = roleId === 'role-1' || roleId === 'role-2' || roleId === 'role-2-change' || roleName.includes('super') || roleName.includes('change desk admin') || roleName.includes('change admin') || (roleName.includes('admin') && !roleName.includes('travel') && !roleName.includes('spend'));
      const isChangeManager = roleId === 'role-3' || roleName.includes('manager') || (identity?.cmCategories && identity.cmCategories.length > 0);
      const isChangeImplementer = roleId === 'role-5' || roleName.includes('implementer') || (identity?.ciCategories && identity.ciCategories.length > 0);

      // Rule: No user (Admin, Super Admin, Change Manager, Change Implementer) sees their own requests in My Worklist
      if (!organizationScope) {
        const ownIds = new Set([actingUserId]);
        if (identity) {
          if (identity.userKey) ownIds.add(identity.userKey);
          if (identity.employeeBusinessId) ownIds.add(identity.employeeBusinessId);
          if (identity.sourceId) ownIds.add(String(identity.sourceId));
          if (identity.id) ownIds.add(String(identity.id));
        }
        const excludeIdsList = Array.from(ownIds).filter(Boolean);
        andClauses.push({ requesterId: { [Op.notIn]: excludeIdsList } });

        if (identity?.employeeBusinessId) {
          andClauses.push({ employeeId: { [Op.ne]: identity.employeeBusinessId } });
        }
      }

      // Rule: In My Worklist, users with assigned categories (Change Managers / Implementers) strictly see requests belonging to their allotted categories
      if (!organizationScope) {
        let assignedCategoryIds = isChangeImplementer ? (identity?.ciCategories || []) : (identity?.cmCategories || []);
        if (!assignedCategoryIds || assignedCategoryIds.length === 0) {
          const userAliases = Array.from(new Set([
            actingUserId,
            ...(identity?.userKey ? [identity.userKey] : []),
            ...(identity?.employeeBusinessId ? [identity.employeeBusinessId] : []),
            ...(identity?.sourceId ? [`EMP-${identity.sourceId}`, `S8-${identity.sourceId}`, String(identity.sourceId)] : []),
            ...(Array.isArray(identity?.aliases) ? identity.aliases : []),
            ...(typeof actingUserId === 'string' && actingUserId.includes('-') ? [actingUserId.split('-')[1]] : [])
          ])).filter(Boolean);

          const ModelToQuery = isChangeImplementer ? ChangeImplementerCategory : ChangeManagerCategory;
          let assignments = await ModelToQuery.findAll({
            where: { userId: { [Op.in]: userAliases } }
          });
          if (assignments.length === 0 && isChangeImplementer) {
            assignments = await ChangeManagerCategory.findAll({
              where: { userId: { [Op.in]: userAliases } }
            });
          }
          assignedCategoryIds = assignments.map(a => a.categoryId);
        }

        if (assignedCategoryIds && assignedCategoryIds.length > 0) {
          const assignedCategories = await CatalogCategory.findAll({
            where: {
              [Op.or]: [
                { id: { [Op.in]: assignedCategoryIds } },
                { name: { [Op.in]: assignedCategoryIds } }
              ]
            }
          });

          const categoryConditions = [];
          for (const c of assignedCategories) {
            categoryConditions.push({ category: c.name });
            categoryConditions.push({ category: { [Op.iLike]: `%${c.name}%` } });
            categoryConditions.push({ category: c.id });
          }
          for (const idOrName of assignedCategoryIds) {
            categoryConditions.push({ category: idOrName });
            categoryConditions.push({ category: { [Op.iLike]: `%${idOrName}%` } });
          }

          if (categoryConditions.length > 0) {
            andClauses.push({ [Op.or]: categoryConditions });
          } else {
            andClauses.push({ id: 'NONE' });
          }
        } else if (!isSuperOrAdmin) {
          andClauses.push({ id: 'NONE' });
        }
      }
    }
  }

  if (dateFilter && dateFilter !== 'overall') {
    const dateClause = buildDateFilterClause(dateFilter, startDate, endDate);
    if (dateClause) andClauses.push(dateClause);
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
    InProcess: 0,
    Implemented: 0,
    'In progress': 0,
    Rejected: 0,
    Draft: 0
  };

  const countRows = await ChangeRequest.findAll({
    where: baseWhere,
    attributes: ['status', 'isDraft', [fn('COUNT', col('id')), 'count']],
    group: ['status', 'isDraft'],
    raw: true
  });

  for (const row of countRows) {
    const st = (row.status || '').toLowerCase();
    const count = Number(row.count) || 0;

    statusCounts.All += count;

    if (st === 'pending' || st === 'submitted') statusCounts.Pending += count;
    else if (st === 'approved') {
      statusCounts.Approved += count;
      statusCounts.InProcess += count;
    }
    else if (st === 'implemented') {
      statusCounts.Implemented += count;
    }
    else if (st === 'in progress' || st === 'scheduled') {
      statusCounts['In progress'] += count;
      statusCounts.Implemented += count;
    }
    else if (st === 'rejected') statusCounts.Rejected += count;
    else if (st === 'draft' || row.isDraft) statusCounts.Draft += count;
  }

  let queryWhere = baseWhere;
  if (status && status.toLowerCase() !== 'all') {
    const stLower = status.toLowerCase();
    let statusClause;
    if (stLower === 'pending') {
      statusClause = { status: { [Op.iLike]: '%pending%' } };
    } else if (stLower === 'approved' || stLower === 'in process' || stLower === 'inprocess') {
      statusClause = { status: 'Approved' };
    } else if (stLower === 'in progress' || stLower === 'implemented') {
      statusClause = { status: { [Op.or]: ['In progress', 'Scheduled', 'Implemented'] } };
    } else if (stLower === 'rejected') {
      statusClause = { status: 'Rejected' };
    } else if (stLower === 'draft') {
      statusClause = { [Op.or]: [{ status: { [Op.iLike]: '%draft%' } }, { isDraft: true }] };
    }

    if (statusClause) {
      queryWhere = andClauses.length > 0
        ? { [Op.and]: [...andClauses, statusClause] }
        : statusClause;
    }
  }

  const { count: total, rows } = await ChangeRequest.findAndCountAll({
    where: queryWhere,
    include: CR_INCLUDE,
    order: [['submittedAt', 'DESC'], ['createdAt', 'DESC'], ['id', 'DESC']]
    ,
    distinct: true,
    limit: l,
    offset
  });

  let userApprovalMap = new Map();
  let decidedByMap = new Map();
  let isSuperOrAdmin = true;
  let isChangeManager = false;
  let isChangeImplementer = false;
  let assignedCategoryIds = new Set();
  let categoryNameToIdMap = new Map();

  const pageRequestIds = rows.map((row) => row.id);
  const allDecidedApprovals = await ChangeRequestApproval.findAll({
    where: { changeRequestId: { [Op.in]: pageRequestIds }, decision: { [Op.ne]: 'Pending' } }
  });
  const uniqueApproverIds = [...new Set(allDecidedApprovals.map((a) => a.approverId).filter(Boolean))];
  const approverResults = await Promise.all(uniqueApproverIds.map(async (approverId) => [
    approverId,
    await IdentityResolver.resolveByKey(approverId)
  ]));
  const approverIdentities = new Map(approverResults.map(([approverId, res]) => [
    approverId,
    res.status === 'SUCCESS' ? res.identity : null
  ]));

  let deciderInfoMap = new Map();
  for (const approval of allDecidedApprovals) {
    const iden = approverIdentities.get(approval.approverId);
    if (iden) {
      deciderInfoMap.set(approval.changeRequestId, {
        name: iden.displayName || iden.name,
        email: iden.email || null
      });
      decidedByMap.set(approval.changeRequestId, iden.displayName || iden.name);
    }
  }

  if (isWorklist && actingUserId) {
    const userApprovals = await ChangeRequestApproval.findAll({
      where: { approverId: actingUserId, changeRequestId: { [Op.in]: pageRequestIds } }
    });
    userApprovalMap = new Map(userApprovals.map((a) => [a.changeRequestId, a.decision]));

    let actingUserKeys = new Set([actingUserId]);
    const identityRes = await IdentityResolver.resolveByKey(actingUserId);
    if (identityRes.status === 'SUCCESS' && identityRes.identity) {
      const iden = identityRes.identity;
      if (iden.userKey) actingUserKeys.add(iden.userKey);
      if (iden.id) actingUserKeys.add(String(iden.id));
      if (iden.sourceId) actingUserKeys.add(String(iden.sourceId));
      if (iden.employeeBusinessId) actingUserKeys.add(iden.employeeBusinessId);
      if (Array.isArray(iden.aliases)) iden.aliases.forEach(a => actingUserKeys.add(a));
    }

    const roleId = identityRes.status === 'SUCCESS' ? identityRes.identity.roleId : null;
    const roleName = String(identityRes.identity?.role || '').toLowerCase();
    isSuperOrAdmin = roleId === 'role-1' || roleId === 'role-2' || roleId === 'role-2-change' || roleName.includes('super') || roleName.includes('change desk admin') || roleName.includes('change admin') || (roleName.includes('admin') && !roleName.includes('travel') && !roleName.includes('spend'));
    isChangeManager = roleId === 'role-3' || roleName.includes('manager') || (identityRes.identity?.cmCategories && identityRes.identity.cmCategories.length > 0);
    isChangeImplementer = roleId === 'role-5' || roleName.includes('implementer') || (identityRes.identity?.ciCategories && identityRes.identity.ciCategories.length > 0);
    const activeCatIds = isChangeImplementer
      ? (identityRes.identity.ciCategories || identityRes.identity.categoryIds || [])
      : (identityRes.identity.cmCategories || identityRes.identity.categoryIds || []);
    assignedCategoryIds = new Set(identityRes.status === 'SUCCESS' ? activeCatIds : []);

    const allCategories = await CatalogCategory.findAll({ attributes: ['id', 'name'] });
    for (const c of allCategories) {
      categoryNameToIdMap.set(c.id, c.id);
      if (c.name) categoryNameToIdMap.set(c.name.toLowerCase().trim(), c.id);
    }
  }

  const approvalCommentsMap = await getConfig('cr_approval_comments', {});

  const requesterIds = [...new Set(rows.map((cr) => cr.requesterId).filter(Boolean).map(String))];
  const requesterResults = await Promise.all(requesterIds.map(async (requesterId) => [
    requesterId,
    await IdentityResolver.resolveByKey(requesterId)
  ]));
  const requesters = new Map(requesterResults);

  const data = rows.map((cr) => {
    const persisted = approvalCommentsMap[cr.id] || {};
    const deciderInfo = deciderInfoMap.get(cr.id) || {};
    const crPlain = typeof cr.get === 'function' ? cr.get({ plain: true }) : { ...cr };
    if (crPlain.requesterId) {
      const requesterRes = requesters.get(String(crPlain.requesterId));
      if (requesterRes.status === 'SUCCESS' && requesterRes.identity) {
        crPlain.employeeName = crPlain.employeeName || requesterRes.identity.displayName || requesterRes.identity.name;
        crPlain.employeeEmail = crPlain.employeeEmail || requesterRes.identity.email;
        crPlain.employeeId = crPlain.employeeId || requesterRes.identity.employeeBusinessId;
      }
    }
    const enrichedCr = {
      ...crPlain,
      approvedComment: persisted.approvedComment || crPlain.approvedComment,
      approvedBy: persisted.approvedBy || deciderInfo.name || crPlain.approvedBy,
      approvedByEmail: persisted.approvedByEmail || deciderInfo.email || crPlain.approvedByEmail || null,
      decidedBy: persisted.approvedBy || persisted.rejectedBy || deciderInfo.name || crPlain.decidedBy,
      decidedByEmail: deciderInfo.email || crPlain.decidedByEmail || null,
      rejectedComment: persisted.rejectedComment || crPlain.rejectedComment,
      rejectionReason: persisted.rejectionReason || persisted.rejectedComment || crPlain.rejectionReason,
      implementedComment: persisted.implementedComment || crPlain.implementedComment
    };
    const serialized = isWorklist ? serializeWorklistEntry(enrichedCr) : serializeChangeRequest(enrichedCr);

    if (isWorklist) {
      const myDecision = userApprovalMap.get(cr.id) || 'Pending';

      let isCategoryAssigned = true;
      if (!isSuperOrAdmin) {
        const resolvedCategoryId = cr.categoryId || categoryNameToIdMap.get((cr.category || '').toLowerCase().trim());
        isCategoryAssigned = resolvedCategoryId ? assignedCategoryIds.has(resolvedCategoryId) : false;
      }

      // Integrity Rule: Users cannot approve/reject their own requests even in organization worklist
      const isSelfRequest = actingUserId ? (
        (cr.requesterId && (cr.requesterId === actingUserId || (typeof actingUserKeys !== 'undefined' && actingUserKeys.has(cr.requesterId)))) ||
        (cr.employeeId && (typeof actingUserKeys !== 'undefined' && actingUserKeys.has(cr.employeeId)))
      ) : false;

      const canAct = !isSelfRequest && (
        isSuperOrAdmin
          ? (myDecision === 'Pending' && cr.status === 'Pending')
          : isChangeImplementer
            ? (isCategoryAssigned && cr.status === 'Approved')
            : (isCategoryAssigned && myDecision === 'Pending' && cr.status === 'Pending')
      );

      const decidedBy = persisted.approvedBy || persisted.rejectedBy || deciderInfo.name || decidedByMap.get(cr.id) || serialized.decidedBy || '—';
      const decidedByEmail = deciderInfo.email || serialized.approvedByEmail || serialized.decidedByEmail || null;
      return {
        ...serialized,
        approvedComment: persisted.approvedComment || serialized.approvedComment,
        approvedBy: persisted.approvedBy || deciderInfo.name || serialized.approvedBy,
        approvedByEmail: deciderInfo.email || serialized.approvedByEmail || null,
        rejectedComment: persisted.rejectedComment || serialized.rejectedComment,
        implementedComment: persisted.implementedComment || serialized.implementedComment,
        status: cr.status,
        myDecision,
        decidedBy,
        decidedByEmail,
        canAct
      };
    }

    return {
      ...serialized,
      approvedComment: persisted.approvedComment || serialized.approvedComment,
      approvedBy: persisted.approvedBy || deciderInfo.name || serialized.approvedBy,
      approvedByEmail: deciderInfo.email || serialized.approvedByEmail || null,
      decidedBy: persisted.approvedBy || persisted.rejectedBy || deciderInfo.name || serialized.decidedBy,
      decidedByEmail: deciderInfo.email || serialized.decidedByEmail || null,
      rejectedComment: persisted.rejectedComment || serialized.rejectedComment,
      implementedComment: persisted.implementedComment || serialized.implementedComment
    };
  });

  const inProcessCount = statusCounts.InProcess || statusCounts.Approved || 0;

  const metrics = {
    pending: statusCounts.Pending || 0,
    approved: statusCounts.Approved || 0,
    inProcess: inProcessCount,
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
  // 1. All Change Admins and Super Admins (role-1 / role-2 / role-2-change) from changedesk_identity_roles
  const adminRoles = await UserAppRole.findAll({
    where: { roleId: { [Op.in]: ['role-1', 'role-2', 'role-2-change'] } },
    transaction: tx
  });
  const adminKeys = adminRoles.map((r) => r.userKey);

  // 2. Change Managers (role-3) assigned to this category
  let cmKeys = [];
  if (categoryId) {
    const cmAssignments = await ChangeManagerCategory.findAll({
      where: { categoryId },
      transaction: tx
    });
    const cmUserIds = cmAssignments.map((a) => a.userId);
    if (cmUserIds.length > 0) {
      const cmRoles = await UserAppRole.findAll({
        where: {
          userKey: { [Op.in]: cmUserIds },
          roleId: 'role-3'
        },
        transaction: tx
      });
      cmKeys = cmRoles.map((r) => r.userKey);
    }
  }

  const voterKeys = Array.from(new Set([...adminKeys, ...cmKeys]));
  return voterKeys.map((key) => ({ id: key, userKey: key }));
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

const identityOwnsRequest = async (actorId, requesterId) => {
  if (!actorId || !requesterId) return false;
  const identityRes = await IdentityResolver.resolveByKey(String(actorId));
  if (identityRes.status !== 'SUCCESS') return actorId === requesterId;
  const identity = identityRes.identity;
  const keys = new Set([actorId, identity.userKey, identity.id, identity.sourceId, identity.employeeBusinessId]);
  (identity.aliases || []).forEach((alias) => keys.add(alias));
  return keys.has(requesterId) || String(requesterId) === String(identity.employeeBusinessId);
};

export const updateDraftChangeRequestService = async (id, actorId, payload = {}) => {
  const cr = await ChangeRequest.findByPk(id);
  if (!cr) {
    const err = new Error(`Change Request ${id} not found`);
    err.statusCode = 404;
    throw err;
  }

  if (actorId && cr.requesterId && !(await identityOwnsRequest(actorId, cr.requesterId))) {
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
  const empKey = actorId || payload.userKey || cr.requesterId;
  let empRecord = null;
  if (typeof empKey === 'string' && empKey.startsWith('EMP-')) {
    const empNumericId = parseInt(empKey.replace('EMP-', ''), 10);
    if (!isNaN(empNumericId)) empRecord = await Employee.findByPk(empNumericId);
  }
  if (!empRecord && (payload.currentUser?.email || cr.employeeEmail)) {
    const emailToLookup = (payload.currentUser?.email || cr.employeeEmail).trim().toLowerCase();
    if (emailToLookup) {
      empRecord = await Employee.findOne({
        where: sequelize.where(sequelize.fn('LOWER', sequelize.col('email')), emailToLookup)
      });
    }
  }
  if (empRecord) {
    if (empRecord.location && String(empRecord.location).trim()) {
      cr.location = String(empRecord.location).trim();
    }
    if (empRecord.empId && String(empRecord.empId).trim()) {
      cr.employeeId = String(empRecord.empId).trim();
    }
  } else if (payload.location && !payload.location.includes('Auto-fetched')) {
    cr.location = payload.location;
  }
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

export const submitDraftChangeRequestService = async (id, actorId = null) => {
  await sequelize.transaction(async (tx) => {
    const cr = await ChangeRequest.findByPk(id, { transaction: tx });
    if (!cr) {
      const err = new Error(`Change Request ${id} not found`);
      err.statusCode = 404;
      throw err;
    }

    if (actorId && !(await identityOwnsRequest(actorId, cr.requesterId))) {
      const err = new Error('Unauthorized: You can only submit your own draft requests');
      err.statusCode = 403;
      throw err;
    }
    if (!cr.isDraft || cr.status !== 'Draft') {
      const err = new Error('Integrity constraint: Only draft requests can be submitted');
      err.statusCode = 400;
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
        detail: `Submitted draft Change Request ${id} ${cr.title} for Change Manager review.`
      },
      tx
    );
  });

  const updated = await ChangeRequest.findByPk(id, { include: CR_INCLUDE });
  return serializeChangeRequest(updated);
};

// Emails of assigned Change Managers for the category.
// If no Change Manager is assigned to the category, falls back ONLY to ChangeDesk Super Admin (role-1) & Admin (role-2 / role-2-change).
const getApproverEmails = async (categoryNameOrId = null) => {
  const emails = [];

  let targetCategoryId = null;
  if (categoryNameOrId) {
    const cat = await CatalogCategory.findOne({
      where: {
        [Op.or]: [
          { id: categoryNameOrId },
          sequelize.where(sequelize.fn('LOWER', sequelize.col('name')), String(categoryNameOrId).toLowerCase().trim())
        ]
      }
    });
    if (cat) {
      targetCategoryId = cat.id;
    } else {
      targetCategoryId = categoryNameOrId;
    }
  }

  // 1. Check specific Change Managers assigned to this category
  if (targetCategoryId) {
    const cmAssignments = await ChangeManagerCategory.findAll({
      where: { categoryId: targetCategoryId },
      raw: true
    });

    for (const cm of cmAssignments) {
      const key = cm.userId;
      const res = await IdentityResolver.resolveByKey(key);
      if (res.status === 'SUCCESS' && res.identity.email) {
        emails.push(res.identity.email.trim());
      }
    }
  }

  // 2. If one or more assigned Change Managers were found, return only them!
  const uniqueEmails = Array.from(new Set(emails.filter(Boolean)));
  if (uniqueEmails.length > 0) {
    return uniqueEmails;
  }

  // 3. Fallback: If no Change Manager is assigned to this category, send only to Super Admin (role-1) and Admin (role-2 / role-2-change)
  console.log(`[mail] No Change Manager assigned to category "${categoryNameOrId || 'General'}" — routing to Super Admin & Admin`);
  const adminRoles = await UserAppRole.findAll({
    where: { roleId: { [Op.in]: ['role-1', 'role-2', 'role-2-change'] } },
    raw: true
  });

  const adminEmails = [];
  for (const r of adminRoles) {
    const key = r.userKey || r.user_key;
    const res = await IdentityResolver.resolveByKey(key);
    if (res.status === 'SUCCESS' && res.identity.email) {
      adminEmails.push(res.identity.email.trim());
    }
  }

  return Array.from(new Set(adminEmails.filter(Boolean)));
};

const resolveUserId = async (idOrName, fallback = null) => {
  if (!idOrName) return fallback;
  if (typeof idOrName === 'string' && (idOrName.startsWith('S8-') || idOrName.startsWith('EMP-'))) {
    return idOrName;
  }
  const identity = await IdentityResolver.resolveByEmail(idOrName);
  if (identity.status === 'SUCCESS') {
    return identity.identity.userKey;
  }
  return idOrName || fallback;
};

export const RESTRICTED_ACTIONS = [
  { action: 'create an email id', subcategoryId: 'subcat-o365-mb' },
  { action: 'disable / revoke mailbox', subcategoryId: 'subcat-o365-mb' },
  { action: 'request m365 license', subcategoryId: 'subcat-o365-lic' },
  { action: 'remove m365 license', subcategoryId: 'subcat-o365-lic' },
  { action: 'request for procurement of laptop / desktop', subcategoryId: 'subcat-asset-dev' },
  { action: 'repair request', subcategoryId: 'subcat-asset-dev' },
  { action: 'dispose request', subcategoryId: 'subcat-asset-dev' },
  { action: 'request for procurement of it hardware / accessories', subcategoryId: 'subcat-asset-hw' },
  { action: 'repair request', subcategoryId: 'subcat-asset-hw' },
  { action: 'dispose request', subcategoryId: 'subcat-asset-hw' },
  { action: 'request physical access', subcategoryId: 'subcat-acc-phys' },
  { action: 'revoke physical access', subcategoryId: 'subcat-acc-phys' }
];

export const createChangeRequestService = async (payload = {}) => {
  const risk = payload.risk || 'Medium';
  const status = 'Pending';
  const requesterId = await resolveUserId(payload.requesterId || payload.requester);
  const requesterRes = requesterId ? await IdentityResolver.resolveByKey(requesterId) : null;
  const requesterUser = requesterRes?.status === 'SUCCESS' ? requesterRes.identity : null;
  const requesterEmail = requesterUser?.email || payload.customFieldValues?.employeeEmail || payload.employeeEmail || '';

  const actionValue = payload.customFieldValues?.actionRequired || payload.actionRequired || '';
  const restrictedAction = RESTRICTED_ACTIONS.some((rule) =>
    rule.action === String(actionValue).trim().toLowerCase() && rule.subcategoryId === payload.subcategoryId
  );
  if (restrictedAction) {
    const inTable = await checkUserInUserTable(requesterEmail, payload.employeeId || requesterUser?.employeeId);
    if (!inTable) {
      const err = new Error(`Action "${actionValue}" is restricted to accounts present in the user table.`);
      err.statusCode = 403;
      throw err;
    }
  }

  let workflowId = payload.workflowId;
  let categoryName = payload.category || 'Software Deployment';
  let subCategoryName = payload.subCategory || '';
  let targetCategoryId = payload.categoryId || null;

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
      targetCategoryId = subcat.categoryId || subcat.category?.id || targetCategoryId;
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
    const catHit = await CatalogCategory.findOne({
      where: {
        [Op.or]: [
          { name: categoryName },
          { id: categoryName },
          { name: { [Op.iLike]: categoryName } }
        ]
      },
      include: [{ model: CatalogSubcategory, as: 'subcategories' }]
    });
    if (catHit?.subcategories && catHit.subcategories.length > 0) {
      workflowId = catHit.subcategories[0].workflowId || workflowId;
    }
  }

  const mergedCustomFields = {
    ...(payload.customFieldValues || {}),
    employeeName: payload.customFieldValues?.employeeName || requesterUser?.displayName || payload.employeeName || '',
    employeeEmail: payload.customFieldValues?.employeeEmail || requesterEmail
  };

  // Resolve authoritative employee details (location + emp_id) from employees table
  let authoritativeLocation = '';
  let authoritativeEmpBusinessId = '';

  let empRecord = null;
  const empKey = payload.userKey || payload.requesterId || payload.currentUser?.userKey;

  if (typeof empKey === 'string' && empKey.startsWith('EMP-')) {
    const empNumericId = parseInt(empKey.replace('EMP-', ''), 10);
    if (!isNaN(empNumericId)) empRecord = await Employee.findByPk(empNumericId);
  } else if (payload.currentUser?.sourceId && payload.currentUser.identityType === 'EMPLOYEE') {
    empRecord = await Employee.findByPk(payload.currentUser.sourceId);
  }

  if (!empRecord && (payload.currentUser?.email || requesterEmail)) {
    const emailToLookup = (payload.currentUser?.email || requesterEmail).trim().toLowerCase();
    if (emailToLookup) {
      empRecord = await Employee.findOne({
        where: sequelize.where(sequelize.fn('LOWER', sequelize.col('email')), emailToLookup)
      });
    }
  }

  if (empRecord) {
    if (empRecord.location && String(empRecord.location).trim()) {
      authoritativeLocation = String(empRecord.location).trim();
    }
    if (empRecord.empId && String(empRecord.empId).trim()) {
      authoritativeEmpBusinessId = String(empRecord.empId).trim();
    }
  }

  const empIdToStore = authoritativeEmpBusinessId || (
    payload.employeeId && !payload.employeeId.startsWith('S8-') && !payload.employeeId.startsWith('EMP-')
      ? payload.employeeId
      : ''
  );

  const createdCR = await ChangeRequest.create({
    id,
    title: payload.title || 'Untitled change request',
    category: categoryName,
    subCategory: subCategoryName,
    subcategoryId: payload.subcategoryId || null,
    employeeId: empIdToStore,
    employeeName: mergedCustomFields.employeeName || null,
    employeeEmail: mergedCustomFields.employeeEmail || requesterEmail || null,
    managerEmail: payload.managerEmail || '',
    location: authoritativeLocation || (payload.location && !payload.location.includes('Auto-fetched') && !payload.location.includes('Not specified') ? payload.location : null),
    justification: payload.justification || '',
    startDate: payload.startDate || null,
    endDate: payload.endDate || null,
    risk,
    activeStep: 1,
    status,
    isDraft: false,
    submittedAt: new Date(),
    closedAt: null,
    requesterId,
    approverId: null,
    workflowId: workflowId || 'wf-1',
    customFieldValues: mergedCustomFields
  });

  await createApprovalSnapshot(createdCR);
  await updateConfig('dashboard_stats', (s) => ({
    total: (s.total || 0) + 1,
    pending: (s.pending || 0) + 1
  }));
  await updateConfig('worklist_metrics', (m) => ({
    ...m,
    pending: (m.pending || 0) + 1
  }));

  await addAuditLog({
    actorId: requesterId,
    action: 'Created Change Request',
    ref: id,
    detail: `Submitted ${id} ${payload.title || 'Untitled change request'} for Change Manager review.`
  });

  const created = await ChangeRequest.findByPk(id, { include: CR_INCLUDE });
  const serialized = serializeChangeRequest(created);

  const categoryTarget = targetCategoryId || categoryName || serialized.category;
  Promise.all([
    getApproverEmails(categoryTarget),
    IdentityResolver.resolveByKey(requesterId)
  ])
    .then(([approverEmails, requesterRes]) =>
      sendChangeRequestCreatedEmail({
        cr: serialized,
        requesterName: requesterRes?.identity?.displayName || requesterRes?.identity?.name,
        approverEmails,
        managerEmail: payload.managerEmail
      })
    )
    .catch((err) => console.error('[mail] change-request notification failed:', err.message));

  return serialized;
};

// ---------- Change Manager worklist ------------------------------

export const getWorklistService = async (actingUserId = null, page = 1, limit = 10, status = null, dateFilter = null, searchQuery = null) => {
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

export const applyWorklistActionService = async ({ id, action, rejectionReason = '', comment = '', actorId = null } = {}) => {
  const actionComment = comment || rejectionReason || '';
  const targetCR = await ChangeRequest.findByPk(id);
  if (!targetCR) {
    const err = new Error(`Change Request ${id} not found.`);
    err.statusCode = 404;
    throw err;
  }
  const identityRes = await IdentityResolver.resolveByKey(actorId);
  const actorName = identityRes.status === 'SUCCESS' ? identityRes.identity.displayName : 'Approver';
  const actorRoleName = identityRes.status === 'SUCCESS' ? identityRes.identity.role : 'Approver';
  const roleId = identityRes.status === 'SUCCESS' ? identityRes.identity.roleId : null;
  const identity = identityRes.status === 'SUCCESS' ? identityRes.identity : null;

  if (['approve', 'reject'].includes(action) && targetCR.status !== 'Pending') {
    const err = new Error(`Invalid lifecycle transition: Cannot ${action} a ${targetCR.status} request.`);
    err.statusCode = 400;
    throw err;
  }
  if (action === 'implement' && targetCR.status !== 'Approved') {
    const err = new Error('Invalid lifecycle transition: Only approved requests can be implemented.');
    err.statusCode = 400;
    throw err;
  }

  // Strict self-approval restriction: any user should not be able to approve or reject their own changes
  const actorIds = new Set([actorId].filter(Boolean));
  if (identity) {
    if (Array.isArray(identity.aliases)) {
      identity.aliases.forEach((alias) => actorIds.add(alias));
    }
    if (identity.userKey) actorIds.add(identity.userKey);
    if (identity.employeeBusinessId) actorIds.add(identity.employeeBusinessId);
    if (identity.sourceId) actorIds.add(String(identity.sourceId));
    if (identity.id) actorIds.add(String(identity.id));
  }

  const isSelf = actorIds.has(targetCR.requesterId) ||
    (identity?.employeeBusinessId && targetCR.employeeId && targetCR.employeeId === identity.employeeBusinessId) ||
    (identity?.email && targetCR.employeeEmail && targetCR.employeeEmail.toLowerCase() === identity.email.toLowerCase()) ||
    (identity?.email && targetCR.requesterEmail && targetCR.requesterEmail.toLowerCase() === identity.email.toLowerCase());

  if (isSelf) {
    const err = new Error(`Self-approval prohibited: You cannot ${action} your own Change Request (${id}).`);
    err.statusCode = 403;
    throw err;
  }
  const isAdminOrSuperAdmin = roleId === 'role-1' || roleId === 'role-2' || roleId === 'role-2-change';
  const isChangeManager = roleId === 'role-3';
  const isChangeImplementer = roleId === 'role-5';
  const assignedCategoryIds = identityRes.status === 'SUCCESS' ? (identityRes.identity.cmCategories || identityRes.identity.ciCategories || identityRes.identity.categoryIds || []) : [];

  if (action === 'implement') {
    let canImplement = isAdminOrSuperAdmin;
    if (!canImplement && isChangeImplementer) {
      let ciAssignedIds = identity?.ciCategories || [];
      if (!ciAssignedIds || ciAssignedIds.length === 0) {
        const assignments = await ChangeImplementerCategory.findAll({
          where: {
            [Op.or]: [
              { userId: actorId },
              ...(identity?.userKey ? [{ userId: identity.userKey }] : []),
              ...(identity?.employeeBusinessId ? [{ userId: identity.employeeBusinessId }] : []),
              ...(identity?.sourceId ? [{ userId: `EMP-${identity.sourceId}` }, { userId: `S8-${identity.sourceId}` }, { userId: String(identity.sourceId) }] : [])
            ]
          }
        });
        ciAssignedIds = assignments.map(a => a.categoryId);
      }

      const assignedCategories = await CatalogCategory.findAll({
        where: { id: { [Op.in]: ciAssignedIds } }
      });
      const categoryNames = assignedCategories.map(c => c.name.toLowerCase().trim());
      const crCategory = (targetCR.category || '').toLowerCase().trim();
      const crCategoryId = targetCR.categoryId || '';

      canImplement = ciAssignedIds.includes(crCategoryId) || categoryNames.some(cn => crCategory.includes(cn) || cn.includes(crCategory));
    }

    if (!canImplement) {
      const err = new Error('Unauthorized: Only Admins, Super Admins, or assigned Change Implementers can mark a Change Request as Implemented.');
      err.statusCode = 403;
      throw err;
    }

    await sequelize.transaction(async (tx) => {
      // Re-fetch under lock / transaction to prevent race conditions on concurrent implementation attempts
      const cr = await ChangeRequest.findByPk(id, { transaction: tx, lock: tx.LOCK?.UPDATE });
      if (!cr) {
        const err = new Error(`Change Request ${id} not found.`);
        err.statusCode = 404;
        throw err;
      }
      if (cr.status !== 'Approved') {
        const err = new Error(`Cannot implement request: Current status is ${cr.status}, must be Approved.`);
        err.statusCode = 400;
        throw err;
      }

      cr.status = 'Implemented';
      cr.closedAt = new Date();
      const existingComments = Array.isArray(cr.comments) ? [...cr.comments] : [];
      if (actionComment) {
        existingComments.push({
          id: `cmt-${Date.now()}`,
          authorName: actorName,
          authorRole: actorRoleName,
          text: actionComment,
          action: 'Implemented',
          createdAt: new Date().toISOString()
        });
        cr.comments = existingComments;
        const currentCustom = cr.customFieldValues && typeof cr.customFieldValues === 'object' ? { ...cr.customFieldValues } : {};
        currentCustom.comments = existingComments;
        currentCustom.implementedComment = actionComment;
        cr.customFieldValues = currentCustom;
        if (typeof cr.changed === 'function') cr.changed('customFieldValues', true);
      }
      await cr.save({ transaction: tx });
      await updateConfig('cr_approval_comments', (map) => ({
        ...map,
        [id]: {
          ...(map[id] || {}),
          implementedComment: actionComment,
          implementedBy: actorName
        }
      }), tx);
      await addAuditLog({ actorId, action: 'CR Implemented', ref: id, detail: `Marked Change Request ${id} as Implemented. Comment: ${actionComment || 'None'}` }, tx);
    });

    const metrics = await getConfig('worklist_metrics');
    return { id, action: 'implement', status: 'Implemented', closedAt: new Date(), implementedComment: actionComment, worklistMetrics: metrics };
  }

  if (isChangeManager && !isAdminOrSuperAdmin) {
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
      { decision, rationale: actionComment, decidedAt: new Date() },
      { where: { changeRequestId: id, approverId: actorId, decision: 'Pending' }, transaction: t }
    );

    if (updatedCount === 0) {
      const existing = await ChangeRequestApproval.findOne({
        where: { changeRequestId: id, approverId: actorId },
        transaction: t
      });
      if (!existing) {
        await ChangeRequestApproval.create(
          { changeRequestId: id, approverId: actorId, decision, rationale: actionComment, decidedAt: new Date() },
          { transaction: t }
        );
      } else {
        await existing.update({ decision, rationale: actionComment, decidedAt: new Date() }, { transaction: t });
      }
    }

    // Optionally mark rationale for other pending approval rows
    await ChangeRequestApproval.update(
      { rationale: 'Resolved by peer approver' },
      { where: { changeRequestId: id, decision: 'Pending', approverId: { [Op.ne]: actorId } }, transaction: t }
    );

    const changeRequest = await ChangeRequest.findByPk(id, { transaction: t });
    if (changeRequest) {
      changeRequest.status = finalStatus;
      if (finalStatus === 'Rejected') {
        changeRequest.closedAt = new Date();
        changeRequest.rejectionReason = actionComment || 'This change request was rejected during Change Manager review.';
      }
      const existingComments = Array.isArray(changeRequest.comments) ? [...changeRequest.comments] : [];
      if (actionComment) {
        existingComments.push({
          id: `cmt-${Date.now()}`,
          authorName: actorName,
          authorRole: actorRoleName,
          text: actionComment,
          action: finalStatus,
          createdAt: new Date().toISOString()
        });
        changeRequest.comments = existingComments;
        const currentCustom = changeRequest.customFieldValues && typeof changeRequest.customFieldValues === 'object'
          ? { ...changeRequest.customFieldValues }
          : {};
        currentCustom.comments = existingComments;
        if (finalStatus === 'Approved') {
          currentCustom.approvedComment = actionComment;
          currentCustom.approvedBy = actorName;
        } else if (finalStatus === 'Rejected') {
          currentCustom.rejectionReason = actionComment;
          currentCustom.rejectedComment = actionComment;
          currentCustom.rejectedBy = actorName;
        }
        changeRequest.customFieldValues = currentCustom;
        if (typeof changeRequest.changed === 'function') changeRequest.changed('customFieldValues', true);
      }
      await changeRequest.save({ transaction: t });

      await updateConfig('cr_approval_comments', (map) => ({
        ...map,
        [id]: {
          ...(map[id] || {}),
          ...(decision === 'Approved' ? { approvedComment: actionComment, approvedBy: actorName, approvedDate: new Date().toISOString() } : {}),
          ...(decision === 'Rejected' ? { rejectedComment: actionComment, rejectionReason: actionComment, rejectedBy: actorName, rejectedDate: new Date().toISOString() } : {})
        }
      }), t);
    }

    await addAuditLog(
      {
        action: `CR ${decision}`,
        ref: changeRequest ? changeRequest.id : id,
        detail: `${decision} by first responder approver (${actorId}). Comment: ${actionComment || 'None'}`,
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
  return {
    id,
    action,
    status: finalStatus,
    approvedComment: decision === 'Approved' ? actionComment : undefined,
    rejectedComment: decision === 'Rejected' ? actionComment : undefined,
    rejectionReason: decision === 'Rejected' ? actionComment : undefined,
    comment: actionComment,
    decidedBy: actorName,
    worklistMetrics: { ...metrics, pending }
  };
};

export const addChangeRequestCommentService = async ({ id, commentText, actorId = null } = {}) => {
  if (!commentText || !commentText.trim()) {
    const err = new Error('Comment text cannot be empty.');
    err.statusCode = 400;
    throw err;
  }
  const identityRes = await IdentityResolver.resolveByKey(actorId);
  const actorName = identityRes.status === 'SUCCESS' ? identityRes.identity.displayName : 'User';
  const actorRoleName = identityRes.status === 'SUCCESS' ? identityRes.identity.role : 'User';
  const roleId = identityRes.status === 'SUCCESS' ? identityRes.identity.roleId : null;
  const isAdminOrSuperAdmin = roleId === 'role-1' || roleId === 'role-2' || roleId === 'role-2-change';
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
    authorName: actorName,
    authorRole: actorRoleName,
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

const SUBCATEGORY_ORDER_MAP = {
  // 1. Server & Infra
  'subcat-srv-lc': 1,
  'subcat-srv-patch': 2,
  'subcat-srv-oth': 3,

  // 2. Network & Connectivity
  'subcat-net-fw': 1,
  'subcat-net-proxy': 2,
  'subcat-net-vpn': 3,
  'subcat-net-oth': 4,

  // 3. Access & Security
  'subcat-acc-app': 1,
  'subcat-acc-phys': 2,
  'subcat-acc-oth': 3,

  // 4. IT Asset
  'subcat-asset-dev': 1,
  'subcat-asset-hw': 2,
  'subcat-asset-sw': 3,
  'subcat-asset-lic': 4,
  'subcat-asset-oth': 5,

  // 5. Office 365 & Collaboration
  'subcat-o365-mb': 1,
  'subcat-o365-lic': 2,
  'subcat-o365-oth': 3,

  // 6. Security Tools & Policies
  'subcat-sec-ep': 1,
  'subcat-sec-oth': 2
};

const CATEGORY_ORDER_MAP = {
  'cat-asset': 1, // IT Asset
  'cat-o365': 2,  // Office 365 & Collaboration
  'cat-acc': 3,   // Access & Security
  'cat-net': 4,   // Network & Connectivity
  'cat-sec': 5,   // Security Tools & Policies
  'cat-srv': 6    // Server & Infra
};

export const getCatalogCategoriesService = async () => {
  // Read-only catalog categories without unused workflow joins
  const rows = await CatalogCategory.findAll({
    include: [
      {
        model: CatalogSubcategory,
        as: 'subcategories',
        where: { status: 'Active' },
        required: false,
        attributes: ['id', 'categoryId', 'name', 'sla', 'status']
      }
    ]
  });

  const OTHER_NAME_MAP = {
    'cat-srv': 'Other Server Changes',
    'cat-net': 'Other Network Changes',
    'cat-acc': 'Other Access Requests',
    'cat-asset': 'Other IT Asset Requests',
    'cat-o365': 'Other Email / M365 Requests',
    'cat-sec': 'Other Security Changes',
    'subcat-srv-oth': 'Other Server Changes',
    'subcat-net-oth': 'Other Network Changes',
    'subcat-acc-oth': 'Other Access Requests',
    'subcat-asset-oth': 'Other IT Asset Requests',
    'subcat-o365-oth': 'Other Email / M365 Requests',
    'subcat-sec-oth': 'Other Security Changes'
  };

  const categories = rows.map((c) => {
    const plain = c.get({ plain: true });
    if (plain.subcategories && Array.isArray(plain.subcategories)) {
      plain.subcategories.forEach((sub) => {
        delete sub.workflowId;
        delete sub.workflow;
        delete sub.risk;
        if (sub.id === 'subcat-sec-ep' || sub.name === 'End Point Agent') {
          sub.name = 'Endpoint Agent';
        }
        if ((sub.name || '').toLowerCase() === 'other' || sub.name === 'Other') {
          sub.name = OTHER_NAME_MAP[sub.id] || OTHER_NAME_MAP[sub.categoryId] || OTHER_NAME_MAP[c.id] || 'Other Request';
          sub.description = `Other ${c.name || ''} change request.`.replace('Other Other', 'Other');
        }
      });
      plain.subcategories.sort((a, b) => {
        const orderA = SUBCATEGORY_ORDER_MAP[a.id] ?? 99;
        const orderB = SUBCATEGORY_ORDER_MAP[b.id] ?? 99;
        return orderA - orderB;
      });
    }
    return plain;
  });

  categories.sort((a, b) => {
    const orderA = CATEGORY_ORDER_MAP[a.id] ?? 99;
    const orderB = CATEGORY_ORDER_MAP[b.id] ?? 99;
    return orderA - orderB;
  });

  return categories;
};

export const getCatalogSubcategoriesService = async (categoryId) => {
  const rows = await CatalogSubcategory.findAll({
    where: { categoryId, status: 'Active' },
    attributes: ['id', 'categoryId', 'name', 'sla', 'status', 'description']
  });
  const list = rows.map((s) => {
    const plain = s.get({ plain: true });
    delete plain.workflowId;
    delete plain.workflow;
    delete plain.risk;
    if (plain.id === 'subcat-sec-ep' || plain.name === 'End Point Agent') {
      plain.name = 'Endpoint Agent';
    }
    return plain;
  });
  list.sort((a, b) => {
    const orderA = SUBCATEGORY_ORDER_MAP[a.id] ?? 99;
    const orderB = SUBCATEGORY_ORDER_MAP[b.id] ?? 99;
    return orderA - orderB;
  });
  return list;
};

export const getSubcategoryFieldsService = async (subcategoryId) => {
  const rows = await CatalogSubcategoryField.findAll({
    where: { subcategoryId },
    order: [['sortOrder', 'ASC']]
  });
  return rows.map((f) => {
    const plain = f.get({ plain: true });
    let dbNeedsUpdate = false;
    if (plain.fieldLabel && (plain.fieldLabel.toLowerCase() === 'current configuration' || plain.fieldLabel.includes('Congfig') || plain.fieldLabel.includes('figuraiton') || plain.fieldLabel.toLowerCase().includes('congfig'))) {
      plain.fieldLabel = 'Current Configuration';
      dbNeedsUpdate = true;
    }
    if (plain.fieldLabel && plain.fieldLabel.includes('Proess')) {
      plain.fieldLabel = plain.fieldLabel.replace('Proess', 'Process');
      dbNeedsUpdate = true;
    }
    if (plain.options && Array.isArray(plain.options)) {
      const fixedOpts = plain.options.map(opt => (typeof opt === 'string' ? opt.replace(/Exisitng/g, 'Existing') : opt));
      if (JSON.stringify(fixedOpts) !== JSON.stringify(plain.options)) {
        plain.options = fixedOpts;
        dbNeedsUpdate = true;
      }
    }
    if (plain.appliesToActions && Array.isArray(plain.appliesToActions)) {
      const fixedActs = plain.appliesToActions.map(act => (typeof act === 'string' ? act.replace(/Exisitng/g, 'Existing') : act));
      if (JSON.stringify(fixedActs) !== JSON.stringify(plain.appliesToActions)) {
        plain.appliesToActions = fixedActs;
        dbNeedsUpdate = true;
      }
    }
    if (dbNeedsUpdate) {
      f.update({
        fieldLabel: plain.fieldLabel,
        options: plain.options,
        appliesToActions: plain.appliesToActions
      }).catch(() => {});
    }
    return plain;
  });
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

  const resolvedActorId = actor ? await resolveUserId(actor) : null;
  await addAuditLog({
    actorId: resolvedActorId || 'SYSTEM',
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

export const createWorkflowService = async (payload = {}, actorId = null) => {
  const id = await nextWorkflowId();
  const name = payload.name || 'New Approval Workflow';
  const steps = payload.steps || 'Draft → Change Manager Review → Approved → Implemented';

  const wf = await Workflow.create({
    id,
    name,
    steps
  });

  await addAuditLog({
    actorId: actorId || payload.actorId || null,
    action: 'Workflow Created',
    ref: id,
    detail: `Added new approval workflow ${id} (${name}).`
  });

  return wf.get({ plain: true });
};

export const getSettingsUsersService = async () => {
  const [s8Users, employees, appRoles, cmAssignments, ciAssignments] = await Promise.all([
    UserS8.findAll({ raw: true }),
    Employee.findAll({ raw: true }),
    UserAppRole.findAll({ raw: true }),
    ChangeManagerCategory.findAll({ raw: true }),
    ChangeImplementerCategory.findAll({ raw: true })
  ]);

  const roleMap = new Map();
  appRoles.forEach((r) => roleMap.set(r.user_key || r.userKey, r.role_id || r.roleId));

  const cmMap = new Map();
  cmAssignments.forEach((c) => {
    const key = c.userId || c.user_id;
    if (!cmMap.has(key)) cmMap.set(key, []);
    cmMap.get(key).push(c.categoryId || c.category_id);
  });

  const ciMap = new Map();
  ciAssignments.forEach((c) => {
    const key = c.userId || c.user_id;
    if (!ciMap.has(key)) ciMap.set(key, []);
    ciMap.get(key).push(c.categoryId || c.category_id);
  });

  const ROLE_NAMES = {
    'role-1': 'Super Admin',
    'role-2-change': 'Change Desk Admin',
    'role-2-prespend': 'Pre-Spend Admin',
    'role-2-travel': 'Travel Desk Admin',
    'role-2': 'Admin',
    'role-3': 'Change Manager',
    'role-4': 'Requester',
    'role-5': 'Change Implementer',
    'role-6': 'Board'
  };

  const results = [];
  const empByEmail = new Map();
  for (const e of employees) {
    if (e.email) {
      empByEmail.set(e.email.trim().toLowerCase(), e);
    }
  }

  // ONLY show users who have been explicitly invited or assigned a ChangeDesk role/category
  for (const u of s8Users) {
    const userKey = `S8-${u.id}`;
    const emailKey = (u.email || '').trim().toLowerCase();
    const linkedEmp = emailKey ? empByEmail.get(emailKey) : null;
    const empKey = linkedEmp ? `EMP-${linkedEmp.id}` : null;
    const empId = linkedEmp ? (linkedEmp.emp_id || linkedEmp.empId) : null;

    // Check if role is assigned to S8 key, EMP key, or raw ID
    const roleId = roleMap.get(userKey) || (empKey ? roleMap.get(empKey) : null) || roleMap.get(String(u.id));

    const assignedCats = roleId === 'role-5'
      ? (ciMap.get(userKey) || (empKey ? ciMap.get(empKey) : null) || ciMap.get(`S8-${u.id}`) || ciMap.get(String(u.id)) || [])
      : (cmMap.get(userKey) || (empKey ? cmMap.get(empKey) : null) || cmMap.get(`S8-${u.id}`) || cmMap.get(String(u.id)) || []);

    // If the user has not been invited or assigned any explicit role or category, do not show them in Settings > Users
    if (!roleId && assignedCats.length === 0) {
      continue;
    }

    results.push({
      id: userKey,
      userKey,
      sourceId: u.id,
      identityType: 'S8_USER',
      name: u.display_name || u.displayName || u.email,
      displayName: u.display_name || u.displayName || u.email,
      email: u.email,
      employeeId: empId,
      employeeBusinessId: empId,
      roleId: roleId || null,
      role: roleId ? ROLE_NAMES[roleId] : 'Unassigned',
      applicationRole: roleId === 'role-1' ? 'SUPER_ADMIN' : roleId === 'role-2-change' ? 'CHANGE_ADMIN' : roleId === 'role-2-prespend' ? 'PRESPEND_ADMIN' : roleId === 'role-2-travel' ? 'TRAVEL_ADMIN' : roleId === 'role-2' ? 'ADMIN' : roleId === 'role-3' ? 'CHANGE_MANAGER' : roleId === 'role-4' ? 'REQUESTER' : roleId === 'role-5' ? 'CHANGE_IMPLEMENTER' : roleId === 'role-6' ? 'BOARD' : 'UNASSIGNED',
      status: u.is_active || u.isActive ? 'Active' : 'Inactive',
      categoryIds: assignedCats,
      isInUserTable: true
    });
  }

  return results;
};

export const updateSettingsUserService = async (userKey, payload = {}, meta = {}) => {
  const { IdentityResolver } = await import('./identityResolver.service.js');
  const res = await IdentityResolver.resolveByKey(userKey);
  if (!res.identity) {
    const err = new Error(`Identity ${userKey} not found`);
    err.statusCode = 404;
    throw err;
  }

  const identity = res.identity;
  let newRoleId = payload.roleId;

  if (!newRoleId && payload.role) {
    const rMap = {
      'super admin': 'role-1',
      'change desk admin': 'role-2-change',
      'change admin': 'role-2-change',
      'pre-spend admin': 'role-2-prespend',
      'prespend admin': 'role-2-prespend',
      'travel desk admin': 'role-2-travel',
      'travel admin': 'role-2-travel',
      admin: 'role-2-change',
      'change manager': 'role-3',
      requester: 'role-4',
      'change implementer': 'role-5',
      board: 'role-6',
      'role-1': 'role-1',
      'role-2-change': 'role-2-change',
      'role-2-prespend': 'role-2-prespend',
      'role-2-travel': 'role-2-travel',
      'role-2': 'role-2-change',
      'role-3': 'role-3',
      'role-4': 'role-4',
      'role-5': 'role-5',
      'role-6': 'role-6'
    };
    newRoleId = rMap[String(payload.role).toLowerCase()];
  }

  if (newRoleId) {
    const validRoleIds = ['role-1', 'role-2-change', 'role-2-prespend', 'role-2-travel', 'role-2', 'role-3', 'role-4', 'role-5', 'role-6'];
    if (!validRoleIds.includes(newRoleId)) {
      const err = new Error('Valid ChangeDesk role is required (Super Admin, Change Desk Admin, Pre-Spend Admin, Travel Desk Admin, Change Manager, Change Implementer, Board)');
      err.statusCode = 400;
      throw err;
    }

    await UserAppRole.upsert({ userKey, roleId: newRoleId });
  }

  // Update employee record if name / empId changed
  if (identity.identityType === 'EMPLOYEE') {
    const emp = await Employee.findByPk(identity.sourceId);
    if (emp) {
      if (payload.name) emp.name = payload.name;
      if (payload.empId || payload.employeeId) emp.empId = payload.empId || payload.employeeId;
      await emp.save();
    }
  } else if (identity.identityType === 'S8_USER') {
    const s8 = await UserS8.findByPk(identity.sourceId);
    if (s8 && payload.name) {
      s8.displayName = payload.name;
      await s8.save();
    }
  }

  if (payload.categoryIds && Array.isArray(payload.categoryIds)) {
    if (newRoleId === 'role-3' || identity.roleId === 'role-3') {
      await updateChangeManagerCategoriesService(userKey, payload.categoryIds);
    } else if (newRoleId === 'role-5' || identity.roleId === 'role-5') {
      await updateChangeImplementerCategoriesService(userKey, payload.categoryIds);
    }
  }

  const actorStr = meta.actorId ? String(meta.actorId) : 'SYSTEM';
  await addAuditLog({
    actorId: actorStr,
    action: 'User Role Updated',
    ref: userKey,
    detail: `Updated role and assignments for ${identity.displayName} (${userKey}).`
  }).catch((logErr) => console.warn('[auditLog] Notice:', logErr.message));

  IdentityResolver.clearCache();
  const updatedRes = await IdentityResolver.resolveByKey(userKey);
  return updatedRes.identity;
};

/** Invites or assigns a ChangeDesk role to a user */
export const createSettingsUserService = async (payload = {}, meta = {}) => {
  const email = payload.email ? String(payload.email).trim().toLowerCase() : null;
  if (!email) {
    const e = new Error('Email is required to invite or add a user');
    e.statusCode = 400;
    throw e;
  }

  const rMap = {
    'super admin': 'role-1',
    'change desk admin': 'role-2-change',
    'change admin': 'role-2-change',
    'pre-spend admin': 'role-2-prespend',
    'prespend admin': 'role-2-prespend',
    'travel desk admin': 'role-2-travel',
    'travel admin': 'role-2-travel',
    admin: 'role-2-change',
    'change manager': 'role-3',
    requester: 'role-4',
    'change implementer': 'role-5',
    board: 'role-6',
    'role-1': 'role-1',
    'role-2-change': 'role-2-change',
    'role-2-prespend': 'role-2-prespend',
    'role-2-travel': 'role-2-travel',
    'role-2': 'role-2-change',
    'role-3': 'role-3',
    'role-4': 'role-4',
    'role-5': 'role-5',
    'role-6': 'role-6'
  };
  const roleId = rMap[String(payload.roleId || payload.role || '').toLowerCase()];

  const validRoleIds = ['role-1', 'role-2-change', 'role-2-prespend', 'role-2-travel', 'role-2', 'role-3', 'role-4', 'role-5', 'role-6'];
  if (!roleId || !validRoleIds.includes(roleId)) {
    const e = new Error('Valid ChangeDesk role is required (Super Admin, Change Desk Admin, Pre-Spend Admin, Travel Desk Admin, Change Manager, Change Implementer, Board)');
    e.statusCode = 400;
    throw e;
  }

  const rawName = (payload.name || '').trim();
  const nameParts = rawName ? rawName.split(/\s+/) : [email.split('@')[0]];
  const displayName = rawName || email.split('@')[0];
  const givenName = nameParts[0] || displayName;
  const familyName = nameParts.slice(1).join(' ') || '';
  const empId = payload.empId || payload.employeeId || null;

  // Check existing records in both directories
  let [s8User, employee] = await Promise.all([
    UserS8.findOne({
      where: sequelize.where(sequelize.fn('LOWER', sequelize.col('email')), email)
    }),
    Employee.findOne({
      where: sequelize.where(sequelize.fn('LOWER', sequelize.col('email')), email)
    })
  ]);

  // 1. ALWAYS create/ensure in UserS8 (user table) so the user is saved in DB and shown on Settings Users page
  if (!s8User) {
    const [maxRes] = await sequelize.query('SELECT COALESCE(MAX(id), 0) AS max_id FROM "user"');
    const nextId = parseInt(maxRes[0]?.max_id || 0, 10) + 1;

    s8User = await UserS8.create({
      id: nextId,
      displayName,
      givenName,
      familyName,
      email,
      isActive: payload.status !== 'Inactive' && payload.status !== 'Disabled'
    });
  } else {
    if (displayName && s8User.displayName !== displayName) {
      s8User.displayName = displayName;
      await s8User.save();
    }
  }

  // 2. Also ensure employee record exists
  if (!employee) {
    const [empMaxRes] = await sequelize.query('SELECT COALESCE(MAX(id), 0) AS max_id FROM employees');
    const nextEmpId = parseInt(empMaxRes[0]?.max_id || 0, 10) + 1;
    const assignedEmpId = empId || `EMP-${10500 + nextEmpId}`;

    employee = await Employee.create({
      id: nextEmpId,
      name: displayName,
      email,
      empId: assignedEmpId,
      location: payload.location || null
    });
  } else {
    if (displayName && employee.name !== displayName) {
      employee.name = displayName;
      await employee.save();
    }
    if (empId && !employee.empId) {
      employee.empId = empId;
      await employee.save();
    }
  }

  const s8Key = `S8-${s8User.id}`;
  const empKey = `EMP-${employee.id}`;
  const primaryKey = s8Key;

  await UserAppRole.upsert({ userKey: s8Key, roleId });
  await UserAppRole.upsert({ userKey: empKey, roleId });

  if (roleId === 'role-3' && Array.isArray(payload.categoryIds) && payload.categoryIds.length > 0) {
    await updateChangeManagerCategoriesService(s8Key, payload.categoryIds);
    await updateChangeManagerCategoriesService(empKey, payload.categoryIds);
  } else if (roleId === 'role-5' && Array.isArray(payload.categoryIds) && payload.categoryIds.length > 0) {
    await updateChangeImplementerCategoriesService(s8Key, payload.categoryIds);
    await updateChangeImplementerCategoriesService(empKey, payload.categoryIds);
  }

  const ROLE_NAMES = {
    'role-1': 'Super Admin',
    'role-2-change': 'Change Desk Admin',
    'role-2-prespend': 'Pre-Spend Admin',
    'role-2-travel': 'Travel Desk Admin',
    'role-2': 'Admin',
    'role-3': 'Change Manager',
    'role-4': 'Requester',
    'role-5': 'Change Implementer',
    'role-6': 'Board'
  };

  const actorStr = meta.actorId ? String(meta.actorId) : 'SYSTEM';
  await addAuditLog({
    actorId: actorStr,
    action: 'User Invited',
    ref: primaryKey,
    detail: `Invited user ${displayName} (${email}) with role ${ROLE_NAMES[roleId] || roleId}.`
  }).catch((logErr) => console.warn('[auditLog] Notice:', logErr.message));

  sendUserInviteEmail({
    user: {
      name: displayName,
      email,
      role: ROLE_NAMES[roleId] || 'Requester'
    },
    tempPassword: payload.tempPassword || payload.password || null,
    invitedByName: meta.invitedByName || 'An Administrator'
  }).catch((err) => console.error('[mail] User invite email failed:', err.message));

  const { IdentityResolver } = await import('./identityResolver.service.js');
  const updatedRes = await IdentityResolver.resolveByKey(primaryKey);
  return updatedRes.identity || {
    id: primaryKey,
    userKey: primaryKey,
    name: displayName,
    displayName,
    email,
    roleId,
    role: ROLE_NAMES[roleId] || 'Requester',
    status: 'Active'
  };
};

export const getSettingsRolesService = async () => {
  const [rows, userRoles] = await Promise.all([
    Role.findAll({ order: [['id', 'ASC']] }),
    UserAppRole.findAll({ attributes: ['roleId'], raw: true })
  ]);

  const counts = {};
  userRoles.forEach((ur) => {
    const rid = ur.roleId || ur.role_id;
    counts[rid] = (counts[rid] || 0) + 1;
  });

  return rows.map((r) => {
    const plainRole = r.get ? r.get({ plain: true }) : r;
    return {
      id: plainRole.id,
      name: plainRole.name,
      usersCount: counts[plainRole.id] || 0,
      description: plainRole.description,
      permissions: plainRole.permissions
    };
  });
};

export const updateRolePermissionsService = async (roleId, permissions = [], actorId = null) => {
  const role = await Role.findByPk(roleId);
  if (!role) {
    const err = new Error(`Role ${roleId} not found`);
    err.statusCode = 404;
    throw err;
  }

  role.permissions = permissions;
  await role.save();

  await addAuditLog({
    actorId: actorId || 'SYSTEM',
    action: 'Role Permissions Updated',
    ref: roleId,
    detail: `Updated permissions for role ${role.name}.`
  });

  const usersCount = await UserAppRole.count({ where: { roleId } });
  const plainRole = role.get ? role.get({ plain: true }) : role;
  return {
    id: plainRole.id,
    name: plainRole.name,
    usersCount,
    description: plainRole.description,
    permissions: plainRole.permissions
  };
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
    order: [['id', 'DESC']]
  });

  const actorKeys = [...new Set(rows.map((r) => r.actorId).filter(Boolean))];
  const identityMap = new Map();
  await Promise.all(
    actorKeys.map(async (k) => {
      // 1. Reuse existing IdentityResolver
      const res = await IdentityResolver.resolveByKey(k);
      if (res.status === 'SUCCESS' && res.identity) {
        identityMap.set(k, res.identity);
        return;
      }

      // 2. Direct directory table lookup if key has S8- or EMP- prefix without active role
      if (k.startsWith('S8-')) {
        const id = parseInt(k.replace('S8-', ''), 10);
        if (!isNaN(id)) {
          const s8User = await UserS8.findByPk(id);
          if (s8User) {
            identityMap.set(k, {
              displayName: s8User.name || s8User.displayName,
              name: s8User.name || s8User.displayName,
              email: s8User.email,
              employeeBusinessId: s8User.empId || null
            });
            return;
          }
        }
      } else if (k.startsWith('EMP-')) {
        const raw = k.replace('EMP-', '');
        const id = parseInt(raw, 10);
        let employee = null;
        if (!isNaN(id)) {
          employee = await Employee.findByPk(id);
        }
        if (!employee) {
          employee = await Employee.findOne({ where: { empId: k } });
        }
        if (employee) {
          identityMap.set(k, {
            displayName: employee.name,
            name: employee.name,
            email: employee.email,
            employeeBusinessId: employee.empId || null
          });
          return;
        }
      }
    })
  );

  const logs = rows.map((r) => {
    const actorIdentity = identityMap.get(r.actorId) || null;
    return serializeAuditLog(r, actorIdentity);
  });

  const key = String(filter).toLowerCase();
  return key === 'all activity' || !AUDIT_FILTERS[key] ? logs : logs.filter(AUDIT_FILTERS[key]);
};

// ---------- Change Manager Categories -----------------


export const getChangeManagerCategoriesService = async (userId) => {
  if (!userId) {
    const assignments = await ChangeManagerCategory.findAll({ raw: true });
    return assignments.map((a) => ({ userId: a.userId, categoryId: a.categoryId }));
  }
  const normalizedKeys = [userId];
  if (typeof userId === 'string' && userId.startsWith('EMP-')) {
    normalizedKeys.push(userId.replace('EMP-', ''));
  } else if (typeof userId === 'string' && userId.startsWith('S8-')) {
    normalizedKeys.push(userId.replace('S8-', ''));
  } else if (!isNaN(Number(userId))) {
    normalizedKeys.push(`EMP-${userId}`);
    normalizedKeys.push(`S8-${userId}`);
  }
  const assignments = await ChangeManagerCategory.findAll({
    where: { userId: { [Op.in]: normalizedKeys } },
    raw: true
  });
  return assignments.map((a) => ({ userId: a.userId, categoryId: a.categoryId }));
};

export const updateChangeManagerCategoriesService = async (userId, categoryIds = []) => {
  const normalizedKeys = [userId];
  if (typeof userId === 'string' && userId.startsWith('EMP-')) {
    normalizedKeys.push(userId.replace('EMP-', ''));
  } else if (typeof userId === 'string' && userId.startsWith('S8-')) {
    normalizedKeys.push(userId.replace('S8-', ''));
  } else if (!isNaN(Number(userId))) {
    normalizedKeys.push(`EMP-${userId}`);
    normalizedKeys.push(`S8-${userId}`);
  }

  const current = await ChangeManagerCategory.findAll({
    where: { userId: { [Op.in]: normalizedKeys } }
  });
  const currentCatIds = current.map((c) => c.categoryId);

  const toAdd = categoryIds.filter((cid) => !currentCatIds.includes(cid));
  const toRemove = currentCatIds.filter((cid) => !categoryIds.includes(cid));

  if (toRemove.length > 0) {
    await ChangeManagerCategory.destroy({
      where: { userId: { [Op.in]: normalizedKeys }, categoryId: { [Op.in]: toRemove } }
    });
  }

  for (const cid of toAdd) {
    const id = `cmc-${userId}-${cid}`;
    await ChangeManagerCategory.upsert({ id, userId, categoryId: cid }).catch(() => {});
  }

  return getChangeManagerCategoriesService(userId);
};

// ---------- Change Implementer Categories -----------------

export const getChangeImplementerCategoriesService = async (userId) => {
  if (!userId) {
    const assignments = await ChangeImplementerCategory.findAll({ raw: true });
    return assignments.map((a) => ({ userId: a.userId, categoryId: a.categoryId }));
  }
  const normalizedKeys = [userId];
  if (typeof userId === 'string' && userId.startsWith('EMP-')) {
    normalizedKeys.push(userId.replace('EMP-', ''));
  } else if (typeof userId === 'string' && userId.startsWith('S8-')) {
    normalizedKeys.push(userId.replace('S8-', ''));
  } else if (!isNaN(Number(userId))) {
    normalizedKeys.push(`EMP-${userId}`);
    normalizedKeys.push(`S8-${userId}`);
  }
  const assignments = await ChangeImplementerCategory.findAll({
    where: { userId: { [Op.in]: normalizedKeys } },
    raw: true
  });
  return assignments.map((a) => ({ userId: a.userId, categoryId: a.categoryId }));
};

export const updateChangeImplementerCategoriesService = async (userId, categoryIds = []) => {
  const normalizedKeys = [userId];
  if (typeof userId === 'string' && userId.startsWith('EMP-')) {
    normalizedKeys.push(userId.replace('EMP-', ''));
  } else if (typeof userId === 'string' && userId.startsWith('S8-')) {
    normalizedKeys.push(userId.replace('S8-', ''));
  } else if (!isNaN(Number(userId))) {
    normalizedKeys.push(`EMP-${userId}`);
    normalizedKeys.push(`S8-${userId}`);
  }

  const current = await ChangeImplementerCategory.findAll({
    where: { userId: { [Op.in]: normalizedKeys } }
  });
  const currentCatIds = current.map((c) => c.categoryId);

  const toAdd = categoryIds.filter((cid) => !currentCatIds.includes(cid));
  const toRemove = currentCatIds.filter((cid) => !categoryIds.includes(cid));

  if (toRemove.length > 0) {
    await ChangeImplementerCategory.destroy({
      where: { userId: { [Op.in]: normalizedKeys }, categoryId: { [Op.in]: toRemove } }
    });
  }

  for (const cid of toAdd) {
    const id = `cic-${userId}-${cid}`;
    await ChangeImplementerCategory.upsert({ id, userId, categoryId: cid }).catch(() => {});
  }

  IdentityResolver.clearCache();
  return getChangeImplementerCategoriesService(userId);
};

