import { Op } from 'sequelize';
import { TravelRequest } from '../models/TravelRequest.js';
import { Employee } from '../models/Employee.js';
import { sequelize } from '../config/database.js';
import { getTravelDeskApproverEmails, getTravelAdminEmails, getBoardMemberEmails } from './userManagement.service.js';
import {
  sendTravelCreatedEmail,
  sendTravelDecisionEmail,
  sendManagerRejectionEmail,
  buildTravelManagerInvitationEmail
} from './mail.service.js';
import { enqueueNotification } from './notificationQueue.service.js';
import { buildDateFilterClause } from '../utils/dateFilterUtils.js';

export const generateTravelCode = async (_tx = null, year = new Date().getFullYear()) => {
  const seqName = `travel_code_seq_${year}`;

  const ensureSeq = async () => {
    const lockKey = 60000 + (parseInt(year, 10) % 10000);
    try {
      await sequelize.query(`SELECT pg_advisory_lock(${lockKey});`);
      const [seqCheck] = await sequelize.query(`SELECT to_regclass('${seqName}') AS regclass;`);
      const [maxRes] = await sequelize.query(
        `SELECT MAX(CAST(SUBSTRING(request_code FROM 'TR-[0-9]+-([0-9]+)') AS INTEGER)) AS max_num FROM travel_requests WHERE request_code LIKE 'TR-${year}-%';`
      );
      const maxNum = (maxRes && maxRes[0] && maxRes[0].max_num) ? parseInt(maxRes[0].max_num, 10) : 0;

      if (!seqCheck[0]?.regclass) {
        const startNum = Math.max(1, maxNum + 1);
        await sequelize.query(`CREATE SEQUENCE IF NOT EXISTS ${seqName} START WITH ${startNum};`);
      } else if (maxNum > 0) {
        // Sync existing sequence forward if maxNum in table is ahead of sequence
        await sequelize.query(`SELECT setval('${seqName}', GREATEST(nextval('${seqName}'), ${maxNum + 1}), false);`).catch(() => {});
      }
    } finally {
      await sequelize.query(`SELECT pg_advisory_unlock(${lockKey});`).catch(() => {});
    }
  };

  await ensureSeq();

  const [result] = await sequelize.query(`SELECT nextval('${seqName}') AS next_id`);
  const nextId = result[0]?.next_id || result[0]?.nextval;
  return `TR-${year}-${String(nextId).padStart(4, '0')}`;
};

export const createTravelService = async (data, user) => {
  const requestCode = await generateTravelCode();
  const requesterId = user?.userKey || user?.id || user?.email || 'unknown';
  const travellerName = data.travellerName || data.Traveller || user?.displayName || user?.name || 'Traveller';
  const travellerEmail = data.travellerEmail || user?.email || '';
  const departureDate = data.departureDate || data['Date of travel'] || data['Date of journey'] || data['Check-in date'] || null;
  const travelMode = data.travelMode || data.category || 'Flight';
  const isFlight = travelMode.toLowerCase() === 'flight' || travelMode.toLowerCase() === 'flights';
  const isCab = travelMode.toLowerCase() === 'cab' || travelMode.toLowerCase() === 'cabs';

  // Determine if Board Approval is required:
  let isShortNotice = Boolean(data.isShortNotice);
  if (isFlight) {
    const flightClass = String(data.travelClass || data['Travel class'] || data.bookingDetails?.['Travel class'] || 'Economy').toLowerCase();
    if (flightClass.includes('premium') || flightClass.includes('business')) {
      isShortNotice = true;
    } else if (departureDate && !isShortNotice) {
      const depTime = new Date(departureDate).getTime();
      const nowTime = new Date().getTime();
      const diffDays = (depTime - nowTime) / (1000 * 60 * 60 * 24);
      if (diffDays < 7) {
        isShortNotice = true;
      }
    }
  }

  if (isCab) {
    const bookingDetails = data.bookingDetails || data.drafts || data || {};
    const passengers = parseInt(bookingDetails['Number of passengers'] || data.passengers || data['Number of passengers'] || '1', 10) || 1;
    const cabTypeStr = String(data.travelClass || bookingDetails['Cab type'] || data['Cab type'] || 'Hatchback').toLowerCase();

    if (cabTypeStr.includes('premium') || cabTypeStr.includes('innova')) {
      isShortNotice = true;
    } else if (cabTypeStr.includes('suv') || cabTypeStr.includes('ertiga')) {
      if (passengers < 3) {
        isShortNotice = true;
      }
    } else if (cabTypeStr.includes('sedan') || cabTypeStr.includes('dzire') || cabTypeStr.includes('aura')) {
      if (passengers < 2) {
        isShortNotice = true;
      }
    }
  }

  let validManagerName = null;
  let validManagerEmail = data.managerEmail || data.Manager ? String(data.managerEmail || data.Manager).trim() : '';

  if (validManagerEmail) {
    const mgrEmp = await Employee.findOne({
      where: sequelize.where(sequelize.fn('LOWER', sequelize.col('email')), validManagerEmail.toLowerCase())
    });
    if (!mgrEmp) {
      const err = new Error(`Selected manager "${validManagerEmail}" is not found in the employee directory.`);
      err.statusCode = 400;
      throw err;
    }
    if (mgrEmp.leftAt || mgrEmp.leftReason || mgrEmp.leftBy) {
      const err = new Error(`Selected manager "${validManagerEmail}" is inactive/exited.`);
      err.statusCode = 400;
      throw err;
    }
    validManagerName = mgrEmp.name || null;
    validManagerEmail = mgrEmp.email || validManagerEmail;
  }

  const created = await TravelRequest.create({
    requestCode,
    requesterId,
    travellerName,
    travellerEmail,
    travelMode,
    purpose: data.purpose || data['Purpose of visit'] || '',
    tripType: data.tripType || data['Trip type'] || data['Journey type'] || '',
    travelClass: data.travelClass || data['Travel class'] || data['Bus type'] || data['Room type'] || '',
    fromLocation: data.fromLocation || data.From || data['From station'] || data['Pickup location'] || '',
    toLocation: data.toLocation || data.To || data['To station'] || data['Final drop location'] || data['City / Location'] || '',
    departureDate,
    returnDate: data.returnDate || data['Return / onward date'] || data['Return date'] || data['Check-out date'] || null,
    preferredTimeSlot: data.preferredTimeSlot || data['Preferred departure time'] || data['Preferred time slot'] || data['Pickup time'] || '',
    isShortNotice,
    bookingDetails: data.bookingDetails || data.drafts || data,
    policyCertified: Boolean(data.certified || data.policyCertified),
    managerName: validManagerName,
    managerEmail: validManagerEmail,
    approvalStage: 'manager_review',
    approvalCycle: 1,
    managerReviewEnteredAt: new Date(),
    status: 'Pending Approval'
  });

  // Enqueue initial Stage 1 Manager Invitation
  if (validManagerEmail) {
    buildTravelManagerInvitationEmail(created).then((mailPayload) =>
      enqueueNotification({
        module: 'travel',
        requestId: created.id,
        approvalCycle: created.approvalCycle,
        jobType: 'manager_invitation',
        recipientEmail: validManagerEmail,
        payload: mailPayload
      })
    ).catch((err) => console.error('[mail] Queue travel manager invite failed:', err.message));
  }

  return created;
};

export const getTravelRequestsService = async ({ user, userId, isWorklist = false, isOrgWorklist = false, organizationScope = false, status, searchQuery, dateFilter, startDate, endDate, page = 1, limit = 10 }) => {
  const where = {};
  const andConditions = [];
  const currentUserId = user?.userKey || user?.id || userId || '';
  const currentUserEmail = (user?.email || '').toLowerCase().trim();
  const isOrgView = isOrgWorklist || organizationScope;

  // 1. My Dashboard View (not worklist and not organization scope): Only requests raised by the logged-in user
  if (!isWorklist && !isOrgView && currentUserId) {
    if (currentUserEmail) {
      andConditions.push({
        [Op.or]: [
          { requesterId: currentUserId },
          { travellerEmail: { [Op.iLike]: currentUserEmail } }
        ]
      });
    } else {
      andConditions.push({ requesterId: currentUserId });
    }
  }

  // 2. My Worklist View (personal approver inbox): Exclude requests raised by the logged-in user
  if (isWorklist && !isOrgWorklist && (currentUserId || currentUserEmail)) {
    if (currentUserId) {
      andConditions.push({ requesterId: { [Op.ne]: currentUserId } });
    }
    if (currentUserEmail) {
      andConditions.push({ travellerEmail: { [Op.notILike]: currentUserEmail } });
    }
  }

  if (status && status !== 'All') {
    if (status.toLowerCase() === 'pending') {
      where.status = { [Op.iLike]: '%Pending%' };
    } else if (status.toLowerCase() === 'approved') {
      where.status = { [Op.or]: [{ [Op.iLike]: '%Approved%' }, { [Op.iLike]: '%Booked%' }, { [Op.iLike]: '%Ticketed%' }] };
    } else if (status.toLowerCase() === 'rejected') {
      where.status = { [Op.iLike]: '%Rejected%' };
    } else if (status.toLowerCase() === 'implemented' || status.toLowerCase() === 'completed') {
      where.status = { [Op.or]: [{ [Op.iLike]: '%Completed%' }, { [Op.iLike]: '%Booked%' }, { [Op.iLike]: '%Ticketed%' }] };
    } else {
      where.status = { [Op.iLike]: `%${status}%` };
    }
  }

  if (searchQuery) {
    andConditions.push({
      [Op.or]: [
        { requestCode: { [Op.iLike]: `%${searchQuery}%` } },
        { travellerName: { [Op.iLike]: `%${searchQuery}%` } },
        { travelMode: { [Op.iLike]: `%${searchQuery}%` } },
        { purpose: { [Op.iLike]: `%${searchQuery}%` } },
        { fromLocation: { [Op.iLike]: `%${searchQuery}%` } },
        { toLocation: { [Op.iLike]: `%${searchQuery}%` } }
      ]
    });
  }

  const dateClause = buildDateFilterClause(dateFilter, startDate, endDate);
  if (dateClause) {
    andConditions.push(dateClause);
  }

  if (andConditions.length > 0) {
    where[Op.and] = andConditions;
  }

  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
  const offset = (safePage - 1) * safeLimit;
  const { rows, count } = await TravelRequest.findAndCountAll({
    where,
    order: [['createdAt', 'DESC']],
    limit: safeLimit,
    offset
  });

  // Calculate high-level summary counts strictly within the scoped where (excluding self requests in personal worklist, respecting dateClause without restricting by status filter)
  const scopedWhere = {};
  if (isWorklist && !isOrgWorklist && (currentUserId || currentUserEmail)) {
    const andConditions = [];
    if (currentUserId) andConditions.push({ requesterId: { [Op.ne]: currentUserId } });
    if (currentUserEmail) andConditions.push({ travellerEmail: { [Op.notILike]: currentUserEmail } });
    if (dateClause) andConditions.push(dateClause);
    if (andConditions.length > 0) scopedWhere[Op.and] = andConditions;
  } else if (dateClause) {
    scopedWhere[Op.and] = [dateClause];
  }
  if (!isWorklist && !isOrgView && currentUserId) {
    if (currentUserEmail) {
      scopedWhere[Op.or] = [
        { requesterId: currentUserId },
        { travellerEmail: { [Op.iLike]: currentUserEmail } }
      ];
    } else {
      scopedWhere.requesterId = currentUserId;
    }
  }

  const allItems = await TravelRequest.findAll({ where: scopedWhere, attributes: ['status', 'travelMode'] });

  let pending = 0;
  let approved = 0;
  let rejected = 0;

  const modeCounts = {};
  allItems.forEach(item => {
    const s = (item.status || '').toLowerCase();
    if (s.includes('pending')) pending++;
    else if (s.includes('approved') || s.includes('booked') || s.includes('ticketed')) approved++;
    else if (s.includes('rejected')) rejected++;

    const m = item.travelMode || 'Flight';
    modeCounts[m] = (modeCounts[m] || 0) + 1;
  });

  const formattedItems = rows.map(r => ({
    id: r.id,
    requestCode: r.requestCode,
    travellerName: r.travellerName,
    travellerEmail: r.travellerEmail,
    department: r.department,
    travelMode: r.travelMode,
    category: r.travelMode,
    title: `${r.travelMode}: ${r.fromLocation || ''} → ${r.toLocation || ''}`,
    purpose: r.purpose,
    tripType: r.tripType,
    travelClass: r.travelClass,
    fromLocation: r.fromLocation,
    toLocation: r.toLocation,
    departureDate: r.departureDate,
    returnDate: r.returnDate,
    preferredTimeSlot: r.preferredTimeSlot,
    isShortNotice: r.isShortNotice,
    bookingDetails: r.bookingDetails || {},
    status: r.status,
    approvalStage: r.approvalStage || 'manager_review',
    managerName: r.managerName || null,
    managerEmail: r.managerEmail || null,
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
    createdAt: r.createdAt,
    submittedAt: r.createdAt
  }));

  return {
    data: formattedItems,
    items: formattedItems,
    total: count,
    totalPages: Math.ceil(count / safeLimit) || 1,
    currentPage: safePage,
    metrics: {
      total: allItems.length,
      pending,
      approved,
      rejected
    },
    categories: Object.entries(modeCounts).map(([mode, cnt]) => ({
      category: mode,
      label: mode,
      count: cnt,
      percentage: allItems.length > 0 ? Math.round((cnt / allItems.length) * 100) : 0
    })),
    statusBreakdown: [
      { status: 'Pending', label: 'Pending Approvals', count: pending },
      { status: 'Approved', label: 'Approved / Booked', count: approved },
      { status: 'Rejected', label: 'Rejected', count: rejected }
    ],
    statusCounts: {
      All: allItems.length,
      Pending: pending,
      Approved: approved,
      Rejected: rejected
    },
    actionableCount: isWorklist ? formattedItems.filter(i => {
      const isPending = (i.status || '').toLowerCase().includes('pending');
      const isSelf = (i.requesterId && String(i.requesterId) === String(currentUserId)) || (i.travellerEmail && currentUserEmail && i.travellerEmail.toLowerCase() === currentUserEmail);
      const isSuperAdmin = user?.isSuperAdmin || user?.roleId === 'role-1' || (user?.role || '').toLowerCase().includes('super');
      const isBoardUser = user?.isBoardUser || user?.roleId === 'role-board' || (user?.role || '').toLowerCase().includes('board');
      const isTravelAdmin = user?.isTravelAdmin || user?.roleId === 'role-2-travel' || ((user?.role || '').toLowerCase().includes('admin') && (user?.role || '').toLowerCase().includes('travel'));

      if (!isPending || isSelf) return false;
      if (i.isShortNotice) return isBoardUser;
      return isSuperAdmin || isBoardUser || isTravelAdmin;
    }).length : 0
  };
};

export const handleTravelActionService = async ({ id, action, comment, actor }) => {
  const actionComment = (comment || '').trim();
  if (!actionComment) {
    const err = new Error(`A non-empty comment is required to ${action} this Travel request.`);
    err.statusCode = 400;
    throw err;
  }

  return sequelize.transaction(async (transaction) => {
    return handleTravelActionWithinTransaction({ id, action, actionComment, actor, transaction });
  });
};

const handleTravelActionWithinTransaction = async ({ id, action, actionComment, actor, transaction }) => {
  // Row-locked read: a concurrent decision on the same request blocks here until the
  // first transaction commits, then sees the now-updated status and is rejected below
  // instead of silently overwriting the first reviewer's decision.
  const req = await TravelRequest.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
  if (!req) {
    const err = new Error(`Travel request ${id} not found`);
    err.statusCode = 404;
    throw err;
  }

  if (['Approved', 'Rejected'].includes(req.status)) {
    const err = new Error(`This travel request has already been ${req.status.toLowerCase()} by another reviewer.`);
    err.statusCode = 409;
    throw err;
  }

  // Authorization Check
  const actorRole = (actor?.role || actor?.roleName || '').toLowerCase();
  const actorRoleId = actor?.roleId || '';
  const actorRolesList = Array.isArray(actor?.roles)
    ? actor.roles.map(r => typeof r === 'string' ? r.toLowerCase() : (r.roleId || r.roleName || '').toLowerCase())
    : Array.isArray(actor?.rolesList)
    ? actor.rolesList.map(r => String(r).toLowerCase())
    : [];

  const isBoardUser =
    actorRoleId === 'role-6' ||
    actorRoleId === 'role-board' ||
    actorRole.includes('board') ||
    actorRolesList.some(r => r === 'role-6' || r === 'role-board' || r.includes('board'));

  const isSuperAdmin =
    actorRoleId === 'role-1' ||
    actorRole.includes('super') ||
    actorRolesList.some(r => r === 'role-1' || r.includes('super'));

  const isTravelAdmin =
    actorRoleId === 'role-2-travel' ||
    (actorRole.includes('admin') && actorRole.includes('travel')) ||
    actorRolesList.some(r => r === 'role-2-travel' || (r.includes('admin') && r.includes('travel')));

  // Integrity Rule: Users cannot approve/reject their own requests across all aliases
  const actorId = actor?.userKey || actor?.id || actor?.email || '';
  const actorEmail = (actor?.email || '').toLowerCase().trim();
  const reqEmail = (req.travellerEmail || '').toLowerCase().trim();
  const reqId = String(req.requesterId || '');

  const actorAliases = new Set([actorId, actor?.userKey, actor?.id, actor?.employeeBusinessId, actorEmail].filter(Boolean));
  if (Array.isArray(actor?.aliases)) {
    actor.aliases.forEach(a => actorAliases.add(String(a)));
  }

  if (
    actorAliases.has(reqId) ||
    (actorEmail && reqEmail && actorEmail === reqEmail)
  ) {
    const err = new Error('Separation of duties violation: You cannot approve or reject your own travel request.');
    err.statusCode = 403;
    throw err;
  }

  const isStage1 = req.approvalStage === 'manager_review';
  const isStage2 = req.approvalStage === 'stage_2_review' || (!req.approvalStage && req.status === 'Pending Approval');

  if (isStage1) {
    // Stage 1: Reporting Manager Review
    const managerEmailLower = (req.managerEmail || '').toLowerCase().trim();
    const isAssignedManager = Boolean(managerEmailLower && actorEmail && managerEmailLower === actorEmail);

    if (!isAssignedManager && !isSuperAdmin) {
      const err = new Error('Unauthorized: This travel request is awaiting approval from the assigned reporting manager.');
      err.statusCode = 403;
      throw err;
    }

    if (action === 'reject') {
      const history = Array.isArray(req.approvalHistory) ? [...req.approvalHistory] : [];
      history.push({
        action: 'reject',
        decision: 'Rejected by Manager',
        comment: actionComment,
        actorName: actor?.displayName || actor?.name || actor?.email || 'Reporting Manager',
        actorEmail: actor?.email || '',
        actorRole: 'Reporting Manager',
        timestamp: new Date().toISOString()
      });

      req.status = 'Rejected';
      req.approvalStage = 'rejected';
      req.approvalHistory = history;
      await req.save({ transaction });

      sendManagerRejectionEmail({
        module: 'travel',
        requestCode: req.requestCode,
        title: `${req.fromLocation} → ${req.toLocation}`,
        requesterEmail: req.travellerEmail,
        requesterName: req.travellerName,
        managerName: actor?.displayName || actor?.name || 'Manager',
        managerEmail: actor?.email,
        comment: actionComment
      }).catch((err) => console.error('[mail] travel manager rejection notify failed:', err.message));

      return req;
    }

    if (action === 'approve') {
      const history = Array.isArray(req.approvalHistory) ? [...req.approvalHistory] : [];
      history.push({
        action: 'approve',
        decision: 'Manager Approved',
        comment: actionComment,
        actorName: actor?.displayName || actor?.name || actor?.email || 'Reporting Manager',
        actorEmail: actor?.email || '',
        actorRole: 'Reporting Manager',
        timestamp: new Date().toISOString()
      });

      req.status = 'Pending Approval';
      req.approvalStage = 'stage_2_review';
      req.approvalHistory = history;
      await req.save({ transaction });

      // Notify Travel Admin / Board Members for Stage 2
      getTravelDeskApproverEmails(req.isShortNotice).then((approverEmails) => {
        sendTravelCreatedEmail({
          travelReq: req.toJSON ? req.toJSON() : req,
          requesterName: req.travellerName,
          requesterEmail: req.travellerEmail,
          approverEmails,
          isShortNotice: req.isShortNotice
        });
      }).catch((err) => console.error('[mail] travel Stage 2 notify failed:', err.message));

      return req;
    }
  }

  // Stage 2: Travel Admin OR Board member
  if (req.isShortNotice) {
    if (!isBoardUser && !isSuperAdmin) {
      const err = new Error('This booking requires Board authorization (Premium/Business class or short-notice booking).');
      err.statusCode = 403;
      throw err;
    }
  } else {
    if (!isTravelAdmin && !isBoardUser && !isSuperAdmin) {
      const err = new Error('Unauthorized: Only Travel Admins or Board Members can decide Stage 2 travel requests.');
      err.statusCode = 403;
      throw err;
    }
  }

  const newStatus = action === 'approve' ? 'Approved' : 'Rejected';
  const history = Array.isArray(req.approvalHistory) ? [...req.approvalHistory] : [];
  history.push({
    action,
    decision: newStatus,
    comment: actionComment,
    actorName: actor?.displayName || actor?.name || actor?.email || 'Approver',
    actorEmail: actor?.email || '',
    actorRole: isBoardUser ? 'Board Member' : isTravelAdmin ? 'Travel Admin' : 'Super Admin',
    timestamp: new Date().toISOString()
  });

  req.status = newStatus;
  req.approvalStage = action === 'approve' ? 'completed' : 'rejected';
  req.approvalHistory = history;
  await req.save({ transaction });

  // Notify Traveller, Travel Admin, and Finance (FINANCE_NOTIFICATION_EMAIL if set)
  Promise.all([
    getTravelAdminEmails()
  ]).then(([adminEmails]) => {
    const financeEmail = process.env.FINANCE_NOTIFICATION_EMAIL ? [process.env.FINANCE_NOTIFICATION_EMAIL] : [];
    if (!process.env.FINANCE_NOTIFICATION_EMAIL) {
      console.warn('[mail] FINANCE_NOTIFICATION_EMAIL is unset in backend environment. Continuing without finance copy.');
    }
    const ccRecipients = Array.from(new Set([...adminEmails, ...financeEmail])).filter(Boolean);

    sendTravelDecisionEmail({
      travelReq: req.toJSON ? req.toJSON() : req,
      action,
      comment: actionComment,
      deciderName: actor?.displayName || actor?.name || actor?.email || 'Approver',
      deciderRole: isBoardUser ? 'Board Member' : isTravelAdmin ? 'Travel Admin' : 'Super Admin',
      cc: ccRecipients
    }).catch((err) => console.error('[mail] travel decision email failed:', err.message));
  }).catch((err) => console.error('[mail] Stage 2 travel decision notify error:', err.message));

  return req;
};
