const normalizeOrigin = (value = '') => (value || '').trim().replace(/\/+$/, '').toLowerCase();

const getHost = (value = '') => {
  const normalizedValue = normalizeOrigin(value);
  if (!normalizedValue) return '';

  try {
    return new URL(normalizedValue).hostname.toLowerCase();
  } catch {
    return normalizedValue
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '')
      .split(':')[0]
      .toLowerCase();
  }
};

const matchesHost = (originHost, allowedHost) => {
  if (!originHost || !allowedHost) return false;
  if (allowedHost.startsWith('*.')) {
    return originHost !== allowedHost.slice(2) && originHost.endsWith(allowedHost.slice(1));
  }
  return originHost === allowedHost || originHost.endsWith(`.${allowedHost}`);
};

export const isAllowedOrigin = (origin, allowedOrigins = []) => {
  if (!origin) return true;

  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) return true;

  const normalizedAllowedOrigins = allowedOrigins.map(normalizeOrigin).filter(Boolean);
  if (normalizedAllowedOrigins.includes('*')) return true;

  const originHost = getHost(normalizedOrigin);

  return normalizedAllowedOrigins.some((allowedOrigin) => {
    if (normalizeOrigin(allowedOrigin) === normalizedOrigin) return true;

    const allowedHost = getHost(allowedOrigin);
    return matchesHost(originHost, allowedHost);
  });
};
