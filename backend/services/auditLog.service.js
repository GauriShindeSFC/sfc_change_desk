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

const AUDIT_FILTERS = {
  'change requests': (log) => /Created|Draft|Submitted|Sent Back/i.test(log.action),
  approvals: (log) => /Approved|Implemented/i.test(log.action),
  rejected: (log) => /Rejected/i.test(log.action),
  'user & role changes': (log) => /User|Permission|Role|Catalog|Workflow/i.test(log.action)
};

export const getSettingsAuditLogsService = async (filter = 'All activity') => {
  const { ChangeUser } = await import('../models/ChangeUser.js');
  const rows = await AuditLog.findAll({
    order: [['id', 'DESC']]
  });

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

  const logs = rows.map((r) => {
    const actorIdentity = identityMap.get(r.actorId) || null;
    return serializeAuditLog(r, actorIdentity);
  });

  const key = String(filter).toLowerCase().trim();
  if (key === 'all activity' || !key) {
    return logs;
  }

  return logs.filter((log) => {
    if (log.category && log.category.toLowerCase().trim() === key) {
      return true;
    }
    const filterFn = AUDIT_FILTERS[key];
    return filterFn ? filterFn(log) : true;
  });
};
