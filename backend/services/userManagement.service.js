import { Op } from 'sequelize';
import { sequelize, Role, CatalogCategory, ChangeManagerCategory, ChangeImplementerCategory } from '../models/index.js';
import { ChangeUser } from '../models/ChangeUser.js';
import { Employee } from '../models/Employee.js';
import { IdentityResolver } from './identityResolver.service.js';
import { addAuditLog } from './auditLog.service.js';
import { normalizeRole } from '../config/constants.js';
import { sendUserInviteEmail } from './mail.service.js';

// ---------- Category Assignments for Change Managers ----------

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

// ---------- Category Assignments for Change Implementers ----------

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

// ---------- Approver & Implementer Email Resolvers ----------

export const getApproverEmails = async (categoryNameOrId = null) => {
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

  if (targetCategoryId) {
    const cmAssignments = await ChangeManagerCategory.findAll({
      where: { categoryId: targetCategoryId },
      raw: true
    });

    for (const cm of cmAssignments) {
      const res = await IdentityResolver.resolveByKey(cm.userId);
      if (res.status === 'SUCCESS' && res.identity.email) {
        emails.push(res.identity.email.trim());
      }
    }
  }

  const uniqueEmails = Array.from(new Set(emails.filter(Boolean)));
  if (uniqueEmails.length > 0) {
    return uniqueEmails;
  }

  const admins = await ChangeUser.findAll({
    where: {
      roleId: { [Op.in]: ['role-1', 'role-2', 'role-2-change'] },
      status: 'Active'
    },
    raw: true
  });

  return Array.from(new Set(admins.map(a => (a.email || '').trim().toLowerCase()).filter(Boolean)));
};

export const getImplementerEmails = async (categoryNameOrId = null) => {
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

  if (targetCategoryId) {
    const ciAssignments = await ChangeImplementerCategory.findAll({
      where: { categoryId: targetCategoryId },
      raw: true
    });

    for (const ci of ciAssignments) {
      const res = await IdentityResolver.resolveByKey(ci.userId);
      if (res.status === 'SUCCESS' && res.identity.email) {
        emails.push(res.identity.email.trim());
      }
    }
  }

  const uniqueEmails = Array.from(new Set(emails.filter(Boolean)));
  if (uniqueEmails.length > 0) {
    return uniqueEmails;
  }

  const implementers = await ChangeUser.findAll({
    where: {
      roleId: { [Op.in]: ['role-5', 'role-1', 'role-2', 'role-2-change'] },
      status: 'Active'
    },
    raw: true
  });

  return Array.from(new Set(implementers.map(i => (i.email || '').trim().toLowerCase()).filter(Boolean)));
};

// ---------- Settings Users & Roles ----------

export const getSettingsUsersService = async () => {
  const PRIVILEGED_ROLE_IDS = [
    'role-1',           // Super Admin
    'role-2-change',    // Change Desk Admin
    'role-2-prespend',  // Pre-Spend Admin
    'role-2-travel',    // Travel Desk Admin
    'role-2',           // Admin (legacy ID)
    'role-3',           // Change Manager
    'role-5',           // Change Implementer
    'role-6'            // Board Member
  ];

  const users = await ChangeUser.findAll({
    where: {
      roleId: { [Op.in]: PRIVILEGED_ROLE_IDS }
    },
    order: [['createdAt', 'DESC']]
  });

  const [cmAssignments, ciAssignments] = await Promise.all([
    ChangeManagerCategory.findAll({ raw: true }),
    ChangeImplementerCategory.findAll({ raw: true })
  ]);

  const cmMap = new Map();
  cmAssignments.forEach((c) => {
    const key = String(c.userId || c.user_id);
    if (!cmMap.has(key)) cmMap.set(key, []);
    cmMap.get(key).push(c.categoryId || c.category_id);
  });

  const ciMap = new Map();
  ciAssignments.forEach((c) => {
    const key = String(c.userId || c.user_id);
    if (!ciMap.has(key)) ciMap.set(key, []);
    ciMap.get(key).push(c.categoryId || c.category_id);
  });

  const results = [];
  for (const u of users) {
    const userKey = String(u.id);
    const email = (u.email || '').trim().toLowerCase();
    const assignedCats = u.roleId === 'role-5'
      ? (ciMap.get(userKey) || ciMap.get(`S8-${u.id}`) || ciMap.get(email) || [])
      : (cmMap.get(userKey) || cmMap.get(`S8-${u.id}`) || cmMap.get(email) || []);

    const isInUserTable = await IdentityResolver.checkUserInUserTable(email);

    // Multi-role extraction
    const rawRoles = u.metadata?.roles || [];
    let rolesList = Array.isArray(rawRoles) && rawRoles.length > 0
      ? rawRoles.map(r => typeof r === 'string' ? normalizeRole(r) : r)
      : [{ roleId: u.roleId, roleName: u.roleName }];

    // Ensure primary role is included if missing
    if (!rolesList.some(r => r.roleId === u.roleId)) {
      rolesList.unshift({ roleId: u.roleId, roleName: u.roleName });
    }

    const authoritativeEmpId = u.metadata?.empId || u.id;

    results.push({
      id: userKey,
      userKey,
      sourceId: u.id,
      identityType: 'CHANGE_USER',
      name: u.name || u.email,
      displayName: u.name || u.email,
      email: u.email,
      designation: u.designation || '',
      empId: authoritativeEmpId,
      employeeId: authoritativeEmpId,
      employeeBusinessId: authoritativeEmpId,
      roleId: u.roleId,
      role: u.roleName,
      roles: rolesList,
      rolesList: rolesList.map(r => r.roleId),
      status: u.status || 'Active',
      categoryIds: assignedCats,
      isInUserTable
    });
  }

  return results;
};

export const updateSettingsUserService = async (userKey, payload = {}, meta = {}) => {
  const rawId = String(userKey).replace(/^(S8-|EMP-|usr-)/, '');
  let user = await ChangeUser.findByPk(rawId);
  if (!user && String(userKey).includes('@')) {
    user = await ChangeUser.findOne({
      where: sequelize.where(sequelize.fn('LOWER', sequelize.col('email')), String(userKey).trim().toLowerCase())
    });
  }

  if (!user) {
    const err = new Error(`User ${userKey} not found in change_user`);
    err.statusCode = 404;
    throw err;
  }

  // Handle multi-role list if passed in payload
  let normalizedRoles = [];
  const currentMeta = user.metadata && typeof user.metadata === 'object' ? { ...user.metadata } : {};
  if (Array.isArray(payload.roles) && payload.roles.length > 0) {
    normalizedRoles = payload.roles.map(r => typeof r === 'string' ? normalizeRole(r) : normalizeRole(r.roleId || r.roleName || r.role)).filter(Boolean);
    const primary = normalizedRoles[0];
    if (primary) {
      user.roleId = primary.roleId;
      user.roleName = primary.roleName;
    }
    currentMeta.roles = normalizedRoles;
  } else if (payload.roleId || payload.role) {
    const matchedRole = normalizeRole(payload.roleId || payload.role);
    if (matchedRole) {
      user.roleId = matchedRole.roleId;
      user.roleName = matchedRole.roleName;
      normalizedRoles = [matchedRole];
      currentMeta.roles = normalizedRoles;
    }
  }

  if (payload.empId || payload.employeeId) {
    currentMeta.empId = String(payload.empId || payload.employeeId).trim();
  }

  user.metadata = currentMeta;
  user.changed('metadata', true);

  if (payload.name) user.name = payload.name;
  if (payload.designation) user.designation = payload.designation;
  if (payload.status) user.status = payload.status;

  await user.save();

  const activeRoleIds = normalizedRoles.map(r => r.roleId);
  const hasCM = activeRoleIds.includes('role-3') || user.roleId === 'role-3';
  const hasCI = activeRoleIds.includes('role-5') || user.roleId === 'role-5';

  if (payload.categoryIds && Array.isArray(payload.categoryIds)) {
    if (hasCM) {
      await updateChangeManagerCategoriesService(user.id, payload.categoryIds);
    }
    if (hasCI) {
      await updateChangeImplementerCategoriesService(user.id, payload.categoryIds);
    }
  }

  const actorStr = meta.actorId ? String(meta.actorId) : 'SYSTEM';
  await addAuditLog({
    actorId: actorStr,
    action: 'User Role Updated',
    ref: String(user.id),
    detail: `Updated role(s) to ${normalizedRoles.map(r => r.roleName).join(', ') || user.roleName} for ${user.name} (${user.email}).`
  }).catch((logErr) => console.warn('[auditLog] Notice:', logErr.message));

  IdentityResolver.clearCache();
  const updatedRes = await IdentityResolver.resolveByKey(user.id);
  return updatedRes.identity;
};

export const createSettingsUserService = async (payload = {}, meta = {}) => {
  const email = payload.email ? String(payload.email).trim().toLowerCase() : null;
  if (!email) {
    const e = new Error('Email is required to invite or add a user');
    e.statusCode = 400;
    throw e;
  }

  let normalizedRoles = [];
  if (Array.isArray(payload.roles) && payload.roles.length > 0) {
    normalizedRoles = payload.roles.map(r => typeof r === 'string' ? normalizeRole(r) : normalizeRole(r.roleId || r.roleName || r.role)).filter(Boolean);
  } else {
    normalizedRoles = [normalizeRole(payload.roleId || payload.role || 'role-4')];
  }

  const primaryRole = normalizedRoles[0] || { roleId: 'role-4', roleName: 'Requester' };
  const rawName = (payload.name || '').trim();
  const displayName = rawName || email.split('@')[0];

  let changeUser = await ChangeUser.findOne({
    where: sequelize.where(sequelize.fn('LOWER', sequelize.col('email')), email)
  });

  const customEmpId = payload.empId || payload.employeeId ? String(payload.empId || payload.employeeId).trim() : null;

  if (changeUser) {
    changeUser.name = displayName;
    changeUser.roleId = primaryRole.roleId;
    changeUser.roleName = primaryRole.roleName;
    changeUser.status = payload.status || 'Active';
    if (payload.designation) changeUser.designation = payload.designation;
    const currentMeta = changeUser.metadata && typeof changeUser.metadata === 'object' ? { ...changeUser.metadata } : {};
    currentMeta.roles = normalizedRoles;
    if (customEmpId) currentMeta.empId = customEmpId;
    changeUser.metadata = currentMeta;
    changeUser.changed('metadata', true);
    await changeUser.save();
  } else {
    const userMeta = { roles: normalizedRoles };
    if (customEmpId) userMeta.empId = customEmpId;
    changeUser = await ChangeUser.create({
      name: displayName,
      email,
      roleId: primaryRole.roleId,
      roleName: primaryRole.roleName,
      designation: payload.designation || '',
      status: 'Active',
      invitedBy: meta.invitedByName || meta.actorId || 'Super Admin',
      metadata: userMeta
    });
  }

  const activeRoleIds = normalizedRoles.map(r => r.roleId);
  const hasCM = activeRoleIds.includes('role-3');
  const hasCI = activeRoleIds.includes('role-5');

  if (payload.categoryIds && Array.isArray(payload.categoryIds) && payload.categoryIds.length > 0) {
    if (hasCM) {
      await updateChangeManagerCategoriesService(changeUser.id, payload.categoryIds);
    }
    if (hasCI) {
      await updateChangeImplementerCategoriesService(changeUser.id, payload.categoryIds);
    }
  }

  const actorStr = meta.actorId ? String(meta.actorId) : 'SYSTEM';
  await addAuditLog({
    actorId: actorStr,
    action: 'User Invited / Added',
    ref: String(changeUser.id),
    detail: `Invited ${displayName} (${email}) with role(s): ${normalizedRoles.map(r => r.roleName).join(', ')}.`
  }).catch((logErr) => console.warn('[auditLog] Notice:', logErr.message));

  sendUserInviteEmail({
    user: {
      name: displayName,
      email,
      role: normalizedRoles.map(r => r.roleName).join(', ') || primaryRole.roleName
    },
    tempPassword: payload.tempPassword || payload.password || null,
    invitedByName: meta.invitedByName || 'An Administrator'
  }).catch((err) => console.error('[mail] User invite email failed:', err.message));

  IdentityResolver.clearCache();
  const resolved = await IdentityResolver.resolveByKey(changeUser.id);
  return resolved.identity;
};

export const getSettingsRolesService = async () => {
  const [rows, users] = await Promise.all([
    Role.findAll({ order: [['id', 'ASC']] }),
    ChangeUser.findAll({ attributes: ['roleId'], raw: true })
  ]);

  const counts = {};
  users.forEach((u) => {
    const rId = u.roleId || 'role-4';
    counts[rId] = (counts[rId] || 0) + 1;
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

  const usersCount = await ChangeUser.count({ where: { roleId } });
  const plainRole = role.get ? role.get({ plain: true }) : role;
  return {
    id: plainRole.id,
    name: plainRole.name,
    usersCount,
    description: plainRole.description,
    permissions: plainRole.permissions
  };
};

export const getAllUsersListService = async () => {
  const employees = await Employee.findAll({
    where: { leftAt: null },
    attributes: ['id', 'name', 'email', 'empId', 'location'],
    order: [['name', 'ASC']],
    raw: true
  });

  return employees
    .filter(e => e && e.name && e.email)
    .map(e => ({
      id: String(e.id),
      name: e.name.trim(),
      email: e.email.trim().toLowerCase(),
      empId: e.empId || '',
      location: e.location || ''
    }));
};
