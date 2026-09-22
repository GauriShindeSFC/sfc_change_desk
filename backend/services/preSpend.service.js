import { Op, fn, col } from 'sequelize';
import { PreSpendRequest } from '../models/PreSpendRequest.js';
import { UserAppRole } from '../models/UserAppRole.js';
import { IdentityResolver } from './identityResolver.service.js';
import { sendPreSpendCreatedEmail, sendPreSpendDecisionEmail } from './mail.service.js';

const getPreSpendApproverEmails = async () => {
  const emails = [];
  // Find Pre-Spend Admins (role-2-prespend, role-1) and Board members (role-6, role-board)
  const approverRoles = await UserAppRole.findAll({
    where: { roleId: { [Op.in]: ['role-1', 'role-2-prespend', 'role-6', 'role-board'] } },
    raw: true
  });

  for (const r of approverRoles) {
    const key = r.userKey || r.user_key;
    if (key) {
      const res = await IdentityResolver.resolveByKey(key);
      if (res?.status === 'SUCCESS' && res?.identity?.email) {
        emails.push(res.identity.email.trim());
      }
    }
  }
  return Array.from(new Set(emails.filter(Boolean)));
};

const generatePreSpendCode = async () => {
  const count = await PreSpendRequest.count();
  const year = new Date().getFullYear();
  const nextNum = String(count + 1).padStart(4, '0');
  return `PS-${year}-${nextNum}`;
};

export const createPreSpendService = async (data, user) => {
  const requestCode = await generatePreSpendCode();
  const requesterId = user?.userKey || user?.id || user?.email || 'unknown';
  const requesterName = user?.displayName || user?.name || user?.email || 'User';
  const requesterEmail = user?.email || '';

  const created = await PreSpendRequest.create({
    requestCode,
    requesterId,
    requesterName,
    requesterEmail,
    category: data.category || 'General',
    subcategory: data.subcategory || '',
    itemDescription: data.buying || data.itemDescription || '',
    estimatedAmount: Number(data.amount || data.estimatedAmount || 0),
    neededByDate: data.neededBy || data.neededByDate || null,
    costCentre: data.costCentre || user?.department || '',
    budgetLine: data.budgetLine || '',
    businessJustification: data.justification || data.businessJustification || '',
    isUrgent: Boolean(data.urgent || data.isUrgent),
    urgentReason: data.urgentReason || '',
    vendors: Array.isArray(data.vendors) ? data.vendors : [],
    selectedVendor: data.selectedVendor || (data.vendors?.[0]?.name || ''),
    commercialException: data.commercial?.exception || data.commercialException || '',
    commercialReason: data.commercial?.reason || data.commercialReason || '',
    commercialJustification: data.commercial?.justification || data.commercialJustification || '',
    policyCertified: Boolean(data.certified || data.policyCertified),
    status: 'Pending Approval'
  });

  // Asynchronously notify Pre-Spend Admin & Board with attached quotation files
  getPreSpendApproverEmails()
    .then((approverEmails) =>
      sendPreSpendCreatedEmail({
        preSpend: created.toJSON ? created.toJSON() : created,
        requesterName,
        requesterEmail,
        approverEmails
      })
    )
    .catch((err) => console.error('[mail] pre-spend notification failed:', err.message));

  return created;
};

export const getPreSpendRequestsService = async ({ user, userId, isWorklist = false, isOrgWorklist = false, status, searchQuery, page = 1, limit = 10 }) => {
  const where = {};
  const currentUserId = user?.userKey || user?.id || userId || '';
  const currentUserEmail = (user?.email || '').toLowerCase().trim();

  // 1. My Dashboard View (not worklist): Only requests raised by the logged-in user
  if (!isWorklist && currentUserId) {
    if (currentUserEmail) {
      where[Op.or] = [
        { requesterId: currentUserId },
        { requesterEmail: { [Op.iLike]: currentUserEmail } }
      ];
    } else {
      where.requesterId = currentUserId;
    }
  }

  // 2. My Worklist View (personal approver inbox): Exclude requests raised by the logged-in user
  if (isWorklist && !isOrgWorklist && (currentUserId || currentUserEmail)) {
    const andConditions = [];
    if (currentUserId) {
      andConditions.push({ requesterId: { [Op.ne]: currentUserId } });
    }
    if (currentUserEmail) {
      andConditions.push({ requesterEmail: { [Op.notILike]: currentUserEmail } });
    }
    if (andConditions.length > 0) {
      where[Op.and] = andConditions;
    }
  }

  if (status && status !== 'All') {
    where.status = { [Op.iLike]: `%${status}%` };
  }

  if (searchQuery) {
    where[Op.or] = [
      { requestCode: { [Op.iLike]: `%${searchQuery}%` } },
      { itemDescription: { [Op.iLike]: `%${searchQuery}%` } },
      { category: { [Op.iLike]: `%${searchQuery}%` } },
      { requesterName: { [Op.iLike]: `%${searchQuery}%` } }
    ];
  }

  const offset = (Number(page) - 1) * Number(limit);
  const { rows, count } = await PreSpendRequest.findAndCountAll({
    where,
    order: [['createdAt', 'DESC']],
    limit: Number(limit),
    offset
  });

  // Calculate summary metrics & category distributions using direct SQL aggregations (GROUP BY)
  const scopedWhere = {};
  if (where[Op.and]) scopedWhere[Op.and] = where[Op.and];
  if (where[Op.or] && !searchQuery) scopedWhere[Op.or] = where[Op.or];
  if (where.requesterId) scopedWhere.requesterId = where.requesterId;

  const [statusAggregates, categoryAggregates] = await Promise.all([
    PreSpendRequest.findAll({
      where: scopedWhere,
      attributes: [
        'status',
        [fn('COUNT', col('id')), 'count'],
        [fn('SUM', col('estimated_amount')), 'totalAmount']
      ],
      group: ['status'],
      raw: true
    }),
    PreSpendRequest.findAll({
      where: scopedWhere,
      attributes: [
        'category',
        [fn('COUNT', col('id')), 'count']
      ],
      group: ['category'],
      raw: true
    })
  ]);

  let pending = 0;
  let approved = 0;
  let rejected = 0;
  let totalAmount = 0;

  statusAggregates.forEach((row) => {
    const s = (row.status || '').toLowerCase();
    const cnt = parseInt(row.count, 10) || 0;
    const amt = parseFloat(row.totalAmount) || 0;
    totalAmount += amt;

    if (s.includes('pending')) {
      pending += cnt;
    } else if (s.includes('approved') || s.includes('procured')) {
      approved += cnt;
    } else if (s.includes('rejected')) {
      rejected += cnt;
    }
  });

  const categoryCounts = {};
  categoryAggregates.forEach((row) => {
    const cat = row.category || 'Other';
    categoryCounts[cat] = parseInt(row.count, 10) || 0;
  });

  const formattedItems = rows.map(r => ({
    id: r.id,
    requestCode: r.requestCode,
    category: r.category,
    subcategory: r.subcategory,
    buying: r.itemDescription,
    title: `${r.category} - ${r.itemDescription}`,
    itemDescription: r.itemDescription,
    amount: Number(r.estimatedAmount),
    estimatedAmount: Number(r.estimatedAmount),
    neededBy: r.neededByDate,
    neededByDate: r.neededByDate,
    costCentre: r.costCentre,
    budgetLine: r.budgetLine,
    justification: r.businessJustification,
    isUrgent: r.isUrgent,
    urgentReason: r.urgentReason,
    vendors: r.vendors || [],
    selectedVendor: r.selectedVendor,
    commercial: {
      exception: r.commercialException,
      reason: r.commercialReason,
      justification: r.commercialJustification
    },
    status: r.status,
    policyCertified: r.policyCertified,
    approvalHistory: r.approvalHistory || [],
    comments: Array.isArray(r.approvalHistory) ? r.approvalHistory.map((h, idx) => ({
      id: `act-${idx}`,
      authorName: h.actorName || 'Reviewer',
      authorRole: h.actorRole || 'Approver',
      text: h.comment || '',
      action: h.decision || h.action,
      createdAt: h.timestamp
    })) : [],
    decidedBy: (Array.isArray(r.approvalHistory) && r.approvalHistory.length > 0)
      ? r.approvalHistory[r.approvalHistory.length - 1].actorName
      : null,
    decidedByEmail: (Array.isArray(r.approvalHistory) && r.approvalHistory.length > 0)
      ? r.approvalHistory[r.approvalHistory.length - 1].actorEmail
      : null,
    approvedComment: (Array.isArray(r.approvalHistory) && r.approvalHistory.find(h => h.action === 'approve'))
      ? r.approvalHistory.find(h => h.action === 'approve').comment
      : null,
    approvedDate: (Array.isArray(r.approvalHistory) && r.approvalHistory.find(h => h.action === 'approve'))
      ? new Date(r.approvalHistory.find(h => h.action === 'approve').timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : null,
    rejectedComment: (Array.isArray(r.approvalHistory) && r.approvalHistory.find(h => h.action === 'reject'))
      ? r.approvalHistory.find(h => h.action === 'reject').comment
      : null,
    rejectionReason: (Array.isArray(r.approvalHistory) && r.approvalHistory.find(h => h.action === 'reject'))
      ? r.approvalHistory.find(h => h.action === 'reject').comment
      : null,
    closedDate: (Array.isArray(r.approvalHistory) && r.approvalHistory.length > 0 && r.status !== 'Pending Approval')
      ? new Date(r.approvalHistory[r.approvalHistory.length - 1].timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : null,
    requesterName: r.requesterName,
    requesterEmail: r.requesterEmail,
    raisedDate: r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
    raisedAt: r.createdAt,
    createdAt: r.createdAt,
    submittedAt: r.createdAt
  }));

  const totalCount = count || (pending + approved + rejected);

  return {
    data: formattedItems,
    items: formattedItems,
    total: count,
    totalPages: Math.ceil(count / limit) || 1,
    currentPage: Number(page),
    metrics: {
      total: totalCount,
      pending,
      approved,
      rejected,
      totalAmount
    },
    categories: Object.entries(categoryCounts).map(([cat, cnt]) => ({
      category: cat,
      label: cat,
      count: cnt,
      percentage: totalCount > 0 ? Math.round((cnt / totalCount) * 100) : 0
    })),
    statusBreakdown: [
      { status: 'Pending', label: 'Pending Approvals', count: pending },
      { status: 'Approved', label: 'Approved', count: approved },
      { status: 'Rejected', label: 'Rejected', count: rejected }
    ],
    statusCounts: {
      All: totalCount,
      Pending: pending,
      Approved: approved,
      Rejected: rejected
    }
  };
};

export const handlePreSpendActionService = async ({ id, action, comment, actor }) => {
  const req = await PreSpendRequest.findByPk(id);
  if (!req) {
    const err = new Error(`Pre-spend request ${id} not found`);
    err.statusCode = 404;
    throw err;
  }

  // Authorization Check
  const actorRole = (actor?.role || '').toLowerCase();
  const actorRoleId = actor?.roleId || '';
  const isBoardUser = actorRoleId === 'role-board' || actorRole.includes('board');
  const isSuperAdmin = actorRoleId === 'role-1' || actorRole.includes('super');
  const isPreSpendAdmin = actorRoleId === 'role-2-prespend' || (actorRole.includes('admin') && (actorRole.includes('spend') || actorRole.includes('prespend')));

  // Integrity Rule: Users cannot approve/reject their own requests
  const actorId = actor?.userKey || actor?.id || actor?.email || '';
  const actorEmail = (actor?.email || '').toLowerCase().trim();
  const reqEmail = (req.requesterEmail || '').toLowerCase().trim();
  const reqId = String(req.requesterId || '');

  if (
    (actorId && reqId && (reqId === String(actorId) || reqId === String(actor?.id) || reqId === String(actor?.userKey))) ||
    (actorEmail && reqEmail && actorEmail === reqEmail)
  ) {
    const err = new Error('Separation of duties violation: You cannot approve or reject your own pre-spend request.');
    err.statusCode = 403;
    throw err;
  }

  if (!isPreSpendAdmin && !isBoardUser && !isSuperAdmin) {
    const err = new Error('Unauthorized to perform action on this pre-spend request.');
    err.statusCode = 403;
    throw err;
  }

  const newStatus = action === 'approve' ? 'Approved' : action === 'reject' ? 'Rejected' : 'Pending Approval';
  const history = Array.isArray(req.approvalHistory) ? [...req.approvalHistory] : [];
  history.push({
    action,
    decision: newStatus,
    comment: comment || '',
    actorName: actor?.displayName || actor?.name || actor?.email || 'Approver',
    actorEmail: actor?.email || '',
    actorRole: isBoardUser ? 'Board Member' : isPreSpendAdmin ? 'Pre-Spend Admin' : 'Super Admin',
    timestamp: new Date().toISOString()
  });

  req.status = newStatus;
  req.approvalHistory = history;
  await req.save();

  // Asynchronously notify Requester of the decision
  sendPreSpendDecisionEmail({
    preSpend: req.toJSON ? req.toJSON() : req,
    action,
    comment,
    deciderName: actor?.displayName || actor?.name || actor?.email || 'Approver',
    deciderRole: isBoardUser ? 'Board Member' : isPreSpendAdmin ? 'Pre-Spend Admin' : 'Super Admin'
  }).catch((err) => console.error('[mail] pre-spend decision email failed:', err.message));

  return req;
};

export const getPastVendorBySubcategoryService = async (subcategory = '', category = '') => {
  if (!subcategory && !category) return null;

  const where = {};
  if (subcategory) {
    where.subcategory = { [Op.iLike]: `%${subcategory.trim()}%` };
  }
  if (category) {
    where.category = { [Op.iLike]: `%${category.trim()}%` };
  }

  // Find the most recent approved or submitted pre-spend request with vendor information
  const pastReq = await PreSpendRequest.findOne({
    where,
    order: [['createdAt', 'DESC']]
  });

  if (!pastReq) return null;

  const vendors = Array.isArray(pastReq.vendors) ? pastReq.vendors : [];
  const preferredVendor = vendors[0] || null;

  if (!preferredVendor && !pastReq.selectedVendor) return null;

  const vendorName = preferredVendor?.name || pastReq.selectedVendor;
  const vendorAmount = preferredVendor?.amount || pastReq.estimatedAmount || 0;
  const quoteDate = preferredVendor?.date || (pastReq.createdAt ? new Date(pastReq.createdAt).toISOString().split('T')[0] : '');

  return {
    vendorName,
    vendorAmount: Number(vendorAmount),
    subcategory: pastReq.subcategory || subcategory,
    category: pastReq.category || category,
    quoteDate,
    requestCode: pastReq.requestCode,
    status: pastReq.status
  };
};

