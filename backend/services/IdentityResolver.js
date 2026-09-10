import { UserS8 } from '../models/UserS8.js';
import { Employee } from '../models/Employee.js';
import { UserAppRole } from '../models/userAppRole.js';
import { Role, ChangeManagerCategory } from '../models/index.js';
import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';

const ROLE_NAME_MAP = {
  'role-1': 'Super Admin',
  'role-2': 'Admin',
  'role-3': 'Change Manager',
  'role-4': 'Requester'
};

const APP_ROLE_MAP = {
  'role-1': 'SUPER_ADMIN',
  'role-2': 'ADMIN',
  'role-3': 'CHANGE_MANAGER',
  'role-4': 'REQUESTER'
};

export class IdentityResolver {
  // Repeated dashboard, badge, and notification requests resolve the same
  // identities. A short cache removes that duplicate database work while
  // keeping role/category changes visible quickly.
  static keyCache = new Map();
  static CACHE_TTL_MS = 30_000;

  /**
   * Resolves identity by email address.
   * Checks both public.users (UserS8) and employees (Employee).
   * Supports dual-source identities (S8-* admin role preferred for login if present).
   */
  static async resolveByEmail(rawEmail) {
    if (!rawEmail || typeof rawEmail !== 'string') {
      return { status: 'NOT_FOUND', message: 'Email address is required' };
    }

    const email = rawEmail.trim().toLowerCase();

    // Query both identity sources
    const [s8Users, employees] = await Promise.all([
      UserS8.findAll({
        where: sequelize.where(sequelize.fn('LOWER', sequelize.col('email')), email)
      }),
      Employee.findAll({
        where: sequelize.where(sequelize.fn('LOWER', sequelize.col('email')), email)
      })
    ]);

    const totalMatches = s8Users.length + employees.length;

    if (totalMatches === 0) {
      return { status: 'NOT_FOUND', message: `No account found for email: ${email}` };
    }

    // Check if intra-table duplicate exists (multiple rows inside S8 or multiple rows inside Employees)
    if (s8Users.length > 1 || employees.length > 1) {
      console.warn(`[IdentityResolver] Intra-table duplicate email detected for "${email}".`);
      return {
        status: 'AMBIGUOUS',
        message: `Multiple records found for email ${email} in single directory. Contact administrator.`
      };
    }

    // Dual-source person (1 S8 user + 1 Employee record)
    // 1. Check if S8 identity has an assigned ChangeDesk role
    if (s8Users.length === 1) {
      const s8User = s8Users[0];
      const s8Key = `S8-${s8User.id}`;
      const s8Res = await this._buildIdentityDTO('S8_USER', s8User, s8Key);
      if (s8Res.status === 'SUCCESS' && s8Res.identity?.isExplicitRole) {
        return s8Res; // S8 administrative identity takes precedence if an explicit role was assigned
      }
    }

    // 2. Next check if Employee identity exists (with assigned role or default Requester)
    if (employees.length === 1) {
      const employee = employees[0];
      const empKey = `EMP-${employee.id}`;
      const empRes = await this._buildIdentityDTO('EMPLOYEE', employee, empKey);
      if (empRes.status === 'SUCCESS') {
        empRes.identity.isInUserTable = s8Users.length > 0;
        return empRes;
      }
    }

    // 3. If only S8 user exists without explicit role, allow login as default Requester
    if (s8Users.length === 1) {
      const s8User = s8Users[0];
      const s8Key = `S8-${s8User.id}`;
      return await this._buildIdentityDTO('S8_USER', s8User, s8Key);
    }

    return {
      status: 'NOT_FOUND',
      message: `Account "${email}" not found.`
    };
  }

  /**
   * Resolves identity by userKey (e.g., 'S8-17' or 'EMP-152').
   */
  static async resolveByKey(userKey) {
    const key = String(userKey || '');
    const cached = this.keyCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.result;

    const result = await this._resolveByKey(key);
    this.keyCache.set(key, { result, expiresAt: Date.now() + this.CACHE_TTL_MS });
    return result;
  }

  static async _resolveByKey(userKey) {
    if (!userKey || typeof userKey !== 'string') {
      return { status: 'NOT_FOUND', message: 'User key is required' };
    }

    if (userKey.startsWith('S8-')) {
      const id = parseInt(userKey.replace('S8-', ''), 10);
      if (isNaN(id)) return { status: 'NOT_FOUND', message: 'Invalid S8 key format' };

      const s8User = await UserS8.findByPk(id);
      if (!s8User) return { status: 'NOT_FOUND', message: `S8 User not found: ${userKey}` };

      return await this._buildIdentityDTO('S8_USER', s8User, userKey);
    } else if (userKey.startsWith('EMP-')) {
      const id = parseInt(userKey.replace('EMP-', ''), 10);
      if (isNaN(id)) return { status: 'NOT_FOUND', message: 'Invalid Employee key format' };

      const employee = await Employee.findByPk(id);
      if (!employee) return { status: 'NOT_FOUND', message: `Employee not found: ${userKey}` };

      return await this._buildIdentityDTO('EMPLOYEE', employee, userKey);
    } else if (userKey.startsWith('usr-')) {
      const id = parseInt(userKey.replace('usr-', ''), 10);
      if (!isNaN(id)) {
        const employee = await Employee.findByPk(id);
        if (employee) return await this._buildIdentityDTO('EMPLOYEE', employee, `EMP-${id}`);
        const s8User = await UserS8.findByPk(id);
        if (s8User) return await this._buildIdentityDTO('S8_USER', s8User, `S8-${id}`);
      }
    } else if (!isNaN(Number(userKey))) {
      const id = parseInt(userKey, 10);
      const employee = await Employee.findByPk(id);
      if (employee) return await this._buildIdentityDTO('EMPLOYEE', employee, `EMP-${id}`);
      const s8User = await UserS8.findByPk(id);
      if (s8User) return await this._buildIdentityDTO('S8_USER', s8User, `S8-${id}`);
    }

    return { status: 'NOT_FOUND', message: `Unrecognized identity key prefix: ${userKey}` };
  }

  /**
   * Helper to fetch role assignment and construct normalized DTO.
   */
  static async _buildIdentityDTO(identityType, record, userKey) {
    let employeeObj = null;
    let employeeBusinessId = null;
    let location = null;

    if (identityType === 'EMPLOYEE') {
      employeeBusinessId = record.empId || null;
      location = record.location || null;
      employeeObj = {
        sourceId: record.id,
        employeeBusinessId,
        empId: employeeBusinessId,
        name: record.name || record.email,
        email: record.email,
        location
      };
    } else if (identityType === 'S8_USER') {
      if (record.email) {
        const empMatch = await Employee.findOne({
          where: sequelize.where(sequelize.fn('LOWER', sequelize.col('email')), record.email.trim().toLowerCase())
        });
        if (empMatch) {
          employeeBusinessId = empMatch.empId || null;
          location = empMatch.location || null;
          employeeObj = {
            sourceId: empMatch.id,
            employeeBusinessId,
            empId: employeeBusinessId,
            name: empMatch.name || record.displayName,
            email: empMatch.email || record.email,
            location
          };
        }
      }
    }

    // Resolve all possible key aliases for this identity (EMP-*, S8-*, usr-*, numeric id, business id)
    const roleKeys = new Set([userKey, String(record.id), `usr-${record.id}`]);
    if (identityType === 'EMPLOYEE') {
      roleKeys.add(`EMP-${record.id}`);
      if (record.empId) roleKeys.add(String(record.empId));
      if (record.email) {
        const s8Match = await UserS8.findOne({
          where: sequelize.where(sequelize.fn('LOWER', sequelize.col('email')), record.email.trim().toLowerCase())
        });
        if (s8Match) {
          roleKeys.add(`S8-${s8Match.id}`);
          roleKeys.add(`usr-${s8Match.id}`);
          roleKeys.add(String(s8Match.id));
        }
      }
    } else {
      roleKeys.add(`S8-${record.id}`);
      if (employeeObj?.sourceId) {
        roleKeys.add(`EMP-${employeeObj.sourceId}`);
        roleKeys.add(String(employeeObj.sourceId));
        roleKeys.add(`usr-${employeeObj.sourceId}`);
      }
      if (employeeBusinessId) roleKeys.add(String(employeeBusinessId));
    }

    const allRoleMappings = await UserAppRole.findAll({
      where: { userKey: { [Op.in]: Array.from(roleKeys) } },
      order: [['updatedAt', 'DESC'], ['createdAt', 'DESC']]
    });

    // Role hierarchy rank (lower number = higher administrative privilege)
    const ROLE_RANK = { 'role-1': 1, 'role-2': 2, 'role-3': 3, 'role-4': 4 };

    // 1. Check if the exact userKey being resolved has a mapping
    const exactMapping = allRoleMappings.find(m => m.userKey === userKey);

    // 2. Find the highest-privilege role among all aliases
    const sortedByPrivilege = [...allRoleMappings].sort((a, b) => {
      const rankA = ROLE_RANK[a.roleId] || 99;
      const rankB = ROLE_RANK[b.roleId] || 99;
      return rankA - rankB;
    });
    const highestPrivilegeMapping = sortedByPrivilege[0] || null;

    // Prefer exact mapping if it's an elevated role; otherwise pick the highest privilege mapping
    const roleMapping = (exactMapping && (ROLE_RANK[exactMapping.roleId] || 99) < 4)
      ? exactMapping
      : (highestPrivilegeMapping || exactMapping || allRoleMappings[0] || null);

    const displayName = identityType === 'S8_USER'
      ? (record.displayName || `${record.givenName || ''} ${record.familyName || ''}`.trim() || record.email)
      : (record.name || record.email);

    // If no explicit role mapping in changedesk_identity_roles, default to Requester (role-4)
    // without modifying the database or inserting into the user table
    const roleId = roleMapping ? roleMapping.roleId : 'role-4';
    const isExplicitRole = Boolean(roleMapping);

    // Validate valid application roles
    if (!['role-1', 'role-2', 'role-3', 'role-4'].includes(roleId)) {
      console.error(`[IdentityResolver] Invalid role ${roleId} assigned to ${userKey}`);
      return {
        status: 'INVALID_ROLE_COMBINATION',
        message: `User assigned invalid role ${roleId}. Access Denied.`
      };
    }

    const applicationRole = APP_ROLE_MAP[roleId] || 'REQUESTER';
    const roleName = ROLE_NAME_MAP[roleId] || 'Requester';

    let cmCategories = [];

    // Fetch CM category assignments if role-3 (Change Manager)
    if (roleId === 'role-3') {
      const assignments = await ChangeManagerCategory.findAll({
        where: {
          userId: { [Op.in]: Array.from(roleKeys) }
        }
      });
      cmCategories = assignments.map(a => a.categoryId);
    }

    const dto = {
      identityType,
      sourceId: record.id,
      userKey,
      id: userKey, // Backward compatible id field
      email: record.email,
      displayName,
      name: displayName,
      applicationRole,
      roleId,
      role: roleName,
      isExplicitRole,
      employeeBusinessId,
      employeeId: employeeBusinessId,
      location,
      employee: employeeObj,
      cmCategories,
      aliases: Array.from(roleKeys),
      isInUserTable: identityType === 'S8_USER'
    };

    return { status: 'SUCCESS', identity: dto };
  }
}

export const resolveEmailForUser = async (userId) => {
  if (!userId) return null;
  const res = await IdentityResolver.resolveByKey(String(userId));
  return (res.status === 'SUCCESS' && res.identity?.email) ? res.identity.email.trim().toLowerCase() : null;
};

export const resolveDualSourceIdentities = async (userId) => {
  if (!userId) return [];
  const res = await IdentityResolver.resolveByKey(String(userId));
  if (res.status !== 'SUCCESS' || !res.identity) return [];
  const identity = res.identity;
  const keys = new Set();
  if (Array.isArray(identity.aliases)) {
    identity.aliases.forEach(k => keys.add(k));
  }
  if (identity.userKey) keys.add(identity.userKey);
  if (identity.employeeBusinessId) keys.add(String(identity.employeeBusinessId));
  if (identity.employee?.empId) keys.add(String(identity.employee.empId));
  if (identity.employee?.sourceId) {
    keys.add(`EMP-${identity.employee.sourceId}`);
    keys.add(String(identity.employee.sourceId));
  }
  return Array.from(keys);
};
