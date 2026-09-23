// ────────────────────────────────────────────────────────────────
// Central Application Constants & Dictionaries
// ────────────────────────────────────────────────────────────────

export const ROLE_ID_TO_NAME = {
  'role-1': 'Super Admin',
  'role-2-change': 'Change Desk Admin',
  'role-2-prespend': 'Pre-Spend Admin',
  'role-2-travel': 'Travel Desk Admin',
  'role-2': 'Change Desk Admin',
  'role-3': 'Change Manager',
  'role-4': 'Requester',
  'role-5': 'Change Implementer',
  'role-6': 'Board Member'
};

export const APP_ROLE_MAP = {
  'role-1': 'SUPER_ADMIN',
  'role-2-change': 'CHANGE_ADMIN',
  'role-2-prespend': 'PRESPEND_ADMIN',
  'role-2-travel': 'TRAVEL_ADMIN',
  'role-2': 'CHANGE_ADMIN',
  'role-3': 'CHANGE_MANAGER',
  'role-4': 'REQUESTER',
  'role-5': 'CHANGE_IMPLEMENTER',
  'role-6': 'BOARD'
};

export const ROLE_LOOKUP_MAP = {
  'super admin': { roleId: 'role-1', roleName: 'Super Admin' },
  'change desk admin': { roleId: 'role-2-change', roleName: 'Change Desk Admin' },
  'change admin': { roleId: 'role-2-change', roleName: 'Change Desk Admin' },
  'pre-spend admin': { roleId: 'role-2-prespend', roleName: 'Pre-Spend Admin' },
  'prespend admin': { roleId: 'role-2-prespend', roleName: 'Pre-Spend Admin' },
  'travel desk admin': { roleId: 'role-2-travel', roleName: 'Travel Desk Admin' },
  'travel admin': { roleId: 'role-2-travel', roleName: 'Travel Desk Admin' },
  'admin': { roleId: 'role-2-change', roleName: 'Change Desk Admin' },
  'change manager': { roleId: 'role-3', roleName: 'Change Manager' },
  'requester': { roleId: 'role-4', roleName: 'Requester' },
  'change implementer': { roleId: 'role-5', roleName: 'Change Implementer' },
  'board': { roleId: 'role-6', roleName: 'Board Member' },
  'board member': { roleId: 'role-6', roleName: 'Board Member' },
  'role-1': { roleId: 'role-1', roleName: 'Super Admin' },
  'role-2-change': { roleId: 'role-2-change', roleName: 'Change Desk Admin' },
  'role-2-prespend': { roleId: 'role-2-prespend', roleName: 'Pre-Spend Admin' },
  'role-2-travel': { roleId: 'role-2-travel', roleName: 'Travel Desk Admin' },
  'role-2': { roleId: 'role-2-change', roleName: 'Change Desk Admin' },
  'role-3': { roleId: 'role-3', roleName: 'Change Manager' },
  'role-4': { roleId: 'role-4', roleName: 'Requester' },
  'role-5': { roleId: 'role-5', roleName: 'Change Implementer' },
  'role-6': { roleId: 'role-6', roleName: 'Board Member' }
};

export const normalizeRole = (roleInput) => {
  if (!roleInput) return { roleId: 'role-4', roleName: 'Requester' };
  const key = String(roleInput).trim().toLowerCase();
  return ROLE_LOOKUP_MAP[key] || {
    roleId: roleInput,
    roleName: ROLE_ID_TO_NAME[roleInput] || 'Requester'
  };
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

export const isRestrictedAction = (actionRequired, subcategoryId) => {
  if (!actionRequired || !subcategoryId) return false;
  const target = String(actionRequired).trim().toLowerCase();
  return RESTRICTED_ACTIONS.some(
    (rule) => rule.action === target && rule.subcategoryId === subcategoryId
  );
};
