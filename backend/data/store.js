// ────────────────────────────────────────────────────────────────
//  Presentation helpers shared by the service/serializer layer.
//  (Data now lives in Postgres — see ../models and ./seed.js)
// ────────────────────────────────────────────────────────────────

export const RISK_STYLES = {
  Low: { riskColor: '#059669', riskBars: 1 },
  Medium: { riskColor: '#D97706', riskBars: 2 },
  High: { riskColor: '#DC2626', riskBars: 3 }
};

export const STATUS_STYLES = {
  Draft: { statusBg: 'var(--input-bg)', statusColor: 'var(--text-secondary)', statusDot: '#94A0B0' },
  Pending: { statusBg: '#FEF3C7', statusColor: '#D97706', statusDot: '#D97706' },
  Approved: { statusBg: '#D1FAE5', statusColor: '#059669', statusDot: '#059669' },
  'In progress': { statusBg: '#F3E8FF', statusColor: '#7C3AED', statusDot: '#7C3AED' },
  Rejected: { statusBg: '#FEE2E2', statusColor: '#DC2626', statusDot: '#DC2626' },
  Closed: { statusBg: 'var(--input-bg)', statusColor: 'var(--text-secondary)', statusDot: '#94A0B0' }
};

export const USER_STATUS_STYLES = {
  Active: { statusBg: '#D1FAE5', statusColor: '#059669', statusDot: '#059669' },
  Inactive: { statusBg: 'var(--input-bg)', statusColor: 'var(--text-secondary)', statusDot: '#94A0B0' }
};

export const riskStyle = (risk = 'Medium') => RISK_STYLES[risk] || RISK_STYLES.Medium;
export const statusStyle = (status = 'Pending') => STATUS_STYLES[status] || STATUS_STYLES.Pending;
export const userStatusStyle = (status = 'Active') =>
  USER_STATUS_STYLES[status] || USER_STATUS_STYLES.Active;

/** Format a Date as "27 Aug 2026". */
export const formatDate = (date = new Date()) =>
  date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

/** Format a Date as "27 Aug 2026 14:32:10" (audit-log style). */
export const formatTimestamp = (date = new Date()) =>
  `${formatDate(date)} ${date.toLocaleTimeString('en-GB', { hour12: false })}`;

/** "2 days ago" / "6 hours ago" / "just now" from a Date or ISO string. */
export const relativeTime = (value) => {
  const then = value instanceof Date ? value : new Date(value);
  const secs = Math.max(0, Math.round((Date.now() - then.getTime()) / 1000));
  const units = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60]
  ];
  for (const [name, size] of units) {
    const n = Math.floor(secs / size);
    if (n >= 1) return `${n} ${name}${n > 1 ? 's' : ''} ago`;
  }
  return 'just now';
};
