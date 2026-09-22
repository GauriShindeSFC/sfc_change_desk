import { Op } from 'sequelize';
import { PreSpendRequest } from '../models/PreSpendRequest.js';

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

  return created;
};

export const getPreSpendRequestsService = async ({ userId, isWorklist = false, status, searchQuery, page = 1, limit = 10 }) => {
  const where = {};

  if (!isWorklist && userId) {
    where.requesterId = userId;
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

  // Calculate high-level summary counts
  const allWhere = isWorklist || !userId ? {} : { requesterId: userId };
  const allItems = await PreSpendRequest.findAll({ where: allWhere, attributes: ['status', 'estimatedAmount', 'category'] });

  let pending = 0;
  let approved = 0;
  let rejected = 0;
  let totalAmount = 0;
  const categoryCounts = {};

  allItems.forEach(item => {
    const s = (item.status || '').toLowerCase();
    const amt = Number(item.estimatedAmount || 0);
    totalAmount += amt;

    if (s.includes('pending')) pending++;
    else if (s.includes('approved') || s.includes('procured')) approved++;
    else if (s.includes('rejected')) rejected++;

    const cat = item.category || 'Other';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
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
    createdAt: r.createdAt,
    submittedAt: r.createdAt
  }));

  return {
    data: formattedItems,
    items: formattedItems,
    total: count,
    totalPages: Math.ceil(count / limit) || 1,
    currentPage: Number(page),
    metrics: {
      total: allItems.length,
      pending,
      approved,
      rejected,
      totalAmount
    },
    categories: Object.entries(categoryCounts).map(([cat, cnt]) => ({
      category: cat,
      label: cat,
      count: cnt,
      percentage: allItems.length > 0 ? Math.round((cnt / allItems.length) * 100) : 0
    })),
    statusBreakdown: [
      { status: 'Pending', label: 'Pending Approvals', count: pending },
      { status: 'Approved', label: 'Approved', count: approved },
      { status: 'Rejected', label: 'Rejected', count: rejected }
    ],
    statusCounts: {
      All: allItems.length,
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

  return req;
};
