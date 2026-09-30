import { Op } from 'sequelize';
import { formatTimestamp } from '../data/store.js';
import { AuditLog } from '../models/index.js';
import { IdentityResolver } from './identityResolver.service.js';
import { serializeAuditLog } from '../utils/serializers.js';

export const addAuditLog = async ({ actorId = null, action, ref = '—', detail = '' }, tx) => {
  return AuditLog.create(
    { timestamp: formatTimestamp(), actorId, action, ref, detail },
    { transaction: tx }
  );
};

// Same category regexes serializeAuditLog() uses to derive `category` (Rejected >
// Approved/Implemented > CR/Created/Draft/Submitted/Sent Back > everything else),
// translated to SQL so filtering can happen in the WHERE clause instead of after
// pulling the whole table into memory.
const REJECTED_RE = 'Rejected';
const APPROVALS_RE = 'Approved|Implemented';
const CHANGE_REQUESTS_RE = 'CR|Created|Draft|Submitted|Sent Back';
const USER_ROLE_RE = 'User|Permission|Role|Catalog|Workflow';

const buildAuditWhereForFilter = (filter) => {
  const key = String(filter || '').toLowerCase().trim();

  if (key === 'rejected') {
    return { action: { [Op.iRegexp]: REJECTED_RE } };
  }
  if (key === 'approvals') {
    return { action: { [Op.iRegexp]: APPROVALS_RE } };
  }
  if (key === 'change requests') {
    return { action: { [Op.iRegexp]: CHANGE_REQUESTS_RE } };
  }
  if (key === 'user & role changes') {
    // Matches the explicit keyword set, OR falls into this bucket the same way
    // serializeAuditLog() defaults to it: anything that isn't Rejected, an
    // Approval/Implementation, or a Change Request action (e.g. "Comment Added").
    return {
      [Op.or]: [
        { action: { [Op.iRegexp]: USER_ROLE_RE } },
        {
          [Op.and]: [
            { action: { [Op.notIRegexp]: REJECTED_RE } },
            { action: { [Op.notIRegexp]: APPROVALS_RE } },
            { action: { [Op.notIRegexp]: CHANGE_REQUESTS_RE } }
          ]
        }
      ]
    };
  }

  return {}; // 'all activity' (or anything unrecognized) — no filter
};

const resolveAndSerializeAuditRows = async (rows) => {
  const { ChangeUser } = await import('../models/ChangeUser.js');
  const actorKeys = [...new Set(rows.map((r) => r.actorId).filter(Boolean))];
  const identityMap = new Map();
  await Promise.all(
    actorKeys.map(async (k) => {
      const res = await IdentityResolver.resolveByKey(k);
      if (res.status === 'SUCCESS' && res.identity) {
        identityMap.set(k, res.identity);
        return;
      }

      // Fallback to direct ChangeUser lookup
      const rawId = String(k).replace(/^(S8-|EMP-|usr-)/, '');
      const user = await ChangeUser.findByPk(rawId);
      if (user) {
        identityMap.set(k, {
          displayName: user.name,
          name: user.name,
          email: user.email,
          employeeBusinessId: user.id
        });
      }
    })
  );

  return rows.map((r) => serializeAuditLog(r, identityMap.get(r.actorId) || null));
};

/**
 * `all: true` (used by the export endpoint) returns every matching row as a plain
 * array, unpaginated. Otherwise returns one page: { data, total, totalPages, currentPage }.
 */
export const getSettingsAuditLogsService = async (filter = 'All activity', { page = 1, limit = 10, all = false } = {}) => {
  const where = buildAuditWhereForFilter(filter);

  if (all) {
    const rows = await AuditLog.findAll({ where, order: [['id', 'DESC']] });
    return resolveAndSerializeAuditRows(rows);
  }

  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
  const offset = (safePage - 1) * safeLimit;

  const { rows, count } = await AuditLog.findAndCountAll({
    where,
    order: [['id', 'DESC']],
    limit: safeLimit,
    offset
  });

  const data = await resolveAndSerializeAuditRows(rows);

  return {
    data,
    total: count,
    totalPages: Math.ceil(count / safeLimit) || 1,
    currentPage: safePage
  };
};
