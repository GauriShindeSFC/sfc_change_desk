import { Op } from 'sequelize';
import { TravelRequest } from '../models/TravelRequest.js';
import { getTravelDeskApproverEmails } from './userManagement.service.js';
import { sendTravelCreatedEmail, sendTravelDecisionEmail } from './mail.service.js';
import { buildDateFilterClause } from '../utils/dateFilterUtils.js';

const generateTravelCode = async () => {
  const year = new Date().getFullYear();
  const records = await TravelRequest.findAll({
    where: {
      requestCode: { [Op.like]: `TR-${year}-%` }
    },
    attributes: ['requestCode'],
    raw: true
  });

  let maxNum = 0;
  for (const r of records) {
    if (r.requestCode) {
      const parts = r.requestCode.split('-');
      const num = parseInt(parts[2], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  const nextNum = String(maxNum + 1).padStart(4, '0');
  return `TR-${year}-${nextNum}`;
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
  // 1. Flight Rules: Premium Economy / Business class OR Short Notice (< 7 days)
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

  // 2. Cab Policy Rules (SUV < 3 passengers, Premium always, Sedan < 2 passengers)
  if (isCab) {
    const bookingDetails = data.bookingDetails || data.drafts || data || {};
    const passengers = parseInt(bookingDetails['Number of passengers'] || data.passengers || data['Number of passengers'] || '1', 10) || 1;
    const cabTypeStr = String(data.travelClass || bookingDetails['Cab type'] || data['Cab type'] || 'Hatchback').toLowerCase();

    if (cabTypeStr.includes('premium') || cabTypeStr.includes('innova')) {
      isShortNotice = true; // Premium cab always requires Board approval
    } else if (cabTypeStr.includes('suv') || cabTypeStr.includes('ertiga')) {
      if (passengers < 3) {
        isShortNotice = true; // SUV for < 3 passengers requires Board approval
      }
    } else if (cabTypeStr.includes('sedan') || cabTypeStr.includes('dzire') || cabTypeStr.includes('aura')) {
      if (passengers < 2) {
        isShortNotice = true; // Sedan for < 2 passengers requires Board approval
      }
    }
  }

  const created = await TravelRequest.create({
    requestCode,
    requesterId,
    travellerName,
    travellerEmail,
    department: data.department || data['Department / Cost Centre'] || user?.department || 'Leadership / Corporate',
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
    status: 'Pending Approval'
  });

  // Asynchronously notify Travel Admin & Board (with special notice if short-notice booking)
  getTravelDeskApproverEmails(isShortNotice)
    .then((approverEmails) =>
      sendTravelCreatedEmail({
        travelReq: created.toJSON ? created.toJSON() : created,
        requesterName: travellerName,
        requesterEmail: travellerEmail,
        approverEmails,
        isShortNotice
      })
    )
    .catch((err) => console.error('[mail] travel notification failed:', err.message));

  return created;
};

export const getTravelRequestsService = async ({ user, userId, isWorklist = false, isOrgWorklist = false, organizationScope = false, status, searchQuery, dateFilter, startDate, endDate, page = 1, limit = 10 }) => {
  const where = {};
  const currentUserId = user?.userKey || user?.id || userId || '';
  const currentUserEmail = (user?.email || '').toLowerCase().trim();
  const isOrgView = isOrgWorklist || organizationScope;

  // 1. My Dashboard View (not worklist and not organization scope): Only requests raised by the logged-in user
  if (!isWorklist && !isOrgView && currentUserId) {
    if (currentUserEmail) {
      where[Op.or] = [
        { requesterId: currentUserId },
        { travellerEmail: { [Op.iLike]: currentUserEmail } }
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
      andConditions.push({ travellerEmail: { [Op.notILike]: currentUserEmail } });
    }
    if (andConditions.length > 0) {
      where[Op.and] = andConditions;
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
    where[Op.or] = [
      { requestCode: { [Op.iLike]: `%${searchQuery}%` } },
      { travellerName: { [Op.iLike]: `%${searchQuery}%` } },
      { travelMode: { [Op.iLike]: `%${searchQuery}%` } },
      { purpose: { [Op.iLike]: `%${searchQuery}%` } },
      { fromLocation: { [Op.iLike]: `%${searchQuery}%` } },
      { toLocation: { [Op.iLike]: `%${searchQuery}%` } }
    ];
  }

  const dateClause = buildDateFilterClause(dateFilter, startDate, endDate);
  if (dateClause) {
    if (where[Op.and]) {
      where[Op.and].push(dateClause);
    } else {
      where[Op.and] = [dateClause];
    }
  }

  const offset = (Number(page) - 1) * Number(limit);
  const { rows, count } = await TravelRequest.findAndCountAll({
    where,
    order: [['createdAt', 'DESC']],
    limit: Number(limit),
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
    totalPages: Math.ceil(count / limit) || 1,
    currentPage: Number(page),
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
    }
  };
};

export const handleTravelActionService = async ({ id, action, comment, actor }) => {
  const req = await TravelRequest.findByPk(id);
  if (!req) {
    const err = new Error(`Travel request ${id} not found`);
    err.statusCode = 404;
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

  // Integrity Rule: Users cannot approve/reject their own requests
  const actorId = actor?.userKey || actor?.id || actor?.email || '';
  const actorEmail = (actor?.email || '').toLowerCase().trim();
  const reqEmail = (req.travellerEmail || '').toLowerCase().trim();
  const reqId = String(req.requesterId || '');

  if (
    (actorId && reqId && (reqId === String(actorId) || reqId === String(actor?.id) || reqId === String(actor?.userKey))) ||
    (actorEmail && reqEmail && actorEmail === reqEmail)
  ) {
    const err = new Error('Separation of duties violation: You cannot approve or reject your own travel request.');
    err.statusCode = 403;
    throw err;
  }

  // Rule: If Board approval is required (short-notice, premium/business flight, cab rules), ONLY Board Member or Super Admin has authorization
  if (req.isShortNotice) {
    if (!isBoardUser && !isSuperAdmin) {
      const err = new Error('This booking requires Board authorization (Premium/Business class or short-notice booking).');
      err.statusCode = 403;
      throw err;
    }
  } else {
    if (!isTravelAdmin && !isBoardUser && !isSuperAdmin) {
      const err = new Error('Unauthorized to perform action on this travel request.');
      err.statusCode = 403;
      throw err;
    }
  }

  const newStatus = action === 'approve' ? 'Approved' : action === 'reject' ? 'Rejected' : 'Pending Approval';
  const history = Array.isArray(req.approvalHistory) ? [...req.approvalHistory] : [];
  history.push({
    action,
    decision: newStatus,
    comment: comment || '',
    actorName: actor?.displayName || actor?.name || actor?.email || 'Approver',
    actorEmail: actor?.email || '',
    actorRole: isBoardUser ? 'Board Member' : isTravelAdmin ? 'Travel Admin' : 'Super Admin',
    timestamp: new Date().toISOString()
  });

  req.status = newStatus;
  req.approvalHistory = history;
  await req.save();

  // Asynchronously notify Traveller of the decision
  sendTravelDecisionEmail({
    travelReq: req.toJSON ? req.toJSON() : req,
    action,
    comment,
    deciderName: actor?.displayName || actor?.name || actor?.email || 'Approver',
    deciderRole: isBoardUser ? 'Board Member' : isTravelAdmin ? 'Travel Admin' : 'Super Admin'
  }).catch((err) => console.error('[mail] travel decision email failed:', err.message));

  return req;
};
