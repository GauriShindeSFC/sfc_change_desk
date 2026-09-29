// Shared Worklist Permissions and Module Resolution Helper
// Resolves permitted modules cumulatively based on the user's complete role set.

/**
 * Returns an array of permitted worklist module IDs for the given user.
 * Permitted modules: 'change_request' | 'prespend' | 'travel'
 *
 * Rules:
 * - Super Admin (role-1 / isSuperAdmin): all three ['change_request', 'prespend', 'travel']
 * - Board User (role-board / isBoardMember / role-6): all three ['change_request', 'prespend', 'travel']
 * - Change Request: role-1, role-2, role-2-change, role-3 (Manager), role-5 (Implementer), or cmCategories / ciCategories assigned
 * - Pre-Spend Request: role-1, role-2-prespend, isPreSpendAdmin, role-6, role-board
 * - Travel Desk: role-1, role-2-travel, isTravelAdmin, role-6, role-board
 * - Independent Set resolution: Multiple roles accumulate without cancelling each other.
 * - No fallback: Returns empty array if user has no approver/admin roles.
 */
export function getAllowedWorklistModules(user) {
  if (!user) return [];

  const roleName = String(user?.role || '').toLowerCase();
  const roleId = String(user?.roleId || '');
  const rawRolesList = Array.isArray(user?.roles) ? user.roles : [];
  const rawRoleIds = Array.isArray(user?.rolesList) ? user.rolesList : [];

  const allRoleStrings = [
    roleName,
    roleId,
    ...rawRolesList.map(r => (typeof r === 'string' ? r : r.roleName || r.name || r.roleId || '')).map(s => String(s).toLowerCase()),
    ...rawRoleIds.map(r => String(r).toLowerCase())
  ];

  const hasRole = (...targets) => {
    return targets.some(target => {
      const t = target.toLowerCase();
      return allRoleStrings.some(r => r === t || r.includes(t));
    });
  };

  const isSuperAdmin = Boolean(
    user?.isSuperAdmin ||
    roleId === 'role-1' ||
    rawRoleIds.includes('role-1') ||
    hasRole('role-1', 'super admin', 'superadmin', 'changedesk super admin')
  );

  const isBoardUser = Boolean(
    user?.isBoardMember ||
    roleId === 'role-board' ||
    roleId === 'role-6' ||
    rawRoleIds.includes('role-6') ||
    rawRoleIds.includes('role-board') ||
    hasRole('board', 'role-board', 'role-6')
  );

  if (isSuperAdmin) {
    return ['change_request', 'prespend', 'travel'];
  }

  const modulesSet = new Set();

  if (isBoardUser) {
    modulesSet.add('prespend');
    modulesSet.add('travel');
  }

  // 1. Change Request Module Checks
  const isChangeAdmin = Boolean(
    user?.isChangeAdmin ||
    roleId === 'role-2' ||
    roleId === 'role-2-change' ||
    rawRoleIds.includes('role-2') ||
    rawRoleIds.includes('role-2-change') ||
    hasRole('role-2-change', 'change desk admin', 'change admin')
  );

  const isChangeManager = Boolean(
    user?.isChangeManager ||
    roleId === 'role-3' ||
    rawRoleIds.includes('role-3') ||
    hasRole('role-3', 'manager', 'change manager') ||
    (Array.isArray(user?.cmCategories) && user.cmCategories.length > 0)
  );

  const isChangeImplementer = Boolean(
    user?.isChangeImplementer ||
    roleId === 'role-5' ||
    rawRoleIds.includes('role-5') ||
    hasRole('role-5', 'implementer', 'change implementer') ||
    (Array.isArray(user?.ciCategories) && user.ciCategories.length > 0)
  );

  if (isChangeAdmin || isChangeManager || isChangeImplementer) {
    modulesSet.add('change_request');
  }

  // 2. Pre-Spend Module Checks
  const isPreSpendAdmin = Boolean(
    user?.isPreSpendAdmin ||
    roleId === 'role-2-prespend' ||
    rawRoleIds.includes('role-2-prespend') ||
    hasRole('role-2-prespend', 'prespend admin', 'pre-spend admin', 'spend admin')
  );

  if (isPreSpendAdmin) {
    modulesSet.add('prespend');
  }

  // 3. Travel Desk Module Checks
  const isTravelAdmin = Boolean(
    user?.isTravelAdmin ||
    roleId === 'role-2-travel' ||
    rawRoleIds.includes('role-2-travel') ||
    hasRole('role-2-travel', 'travel admin', 'travel desk admin')
  );

  if (isTravelAdmin) {
    modulesSet.add('travel');
  }

  return Array.from(modulesSet);
}
