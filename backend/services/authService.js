// ────────────────────────────────────────────────────────────────
//  Auth service – Email-only development authentication using IdentityResolver.
// ────────────────────────────────────────────────────────────────
import jwt from 'jsonwebtoken';
import { IdentityResolver } from './IdentityResolver.js';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required and not set.');
}
const SECRET = process.env.JWT_SECRET;
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const initials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('') || 'U';

import { UserS8 } from '../models/UserS8.js';
import { sequelize } from '../config/database.js';

/** Check if email exists in public.users (S8 table) */
export const checkUserInUserTable = async (email) => {
  if (!email) return false;
  try {
    const s8User = await UserS8.findOne({
      where: sequelize.where(sequelize.fn('LOWER', sequelize.col('email')), email.trim().toLowerCase())
    });
    return Boolean(s8User);
  } catch (err) {
    return false;
  }
};

/** Formats normalized identity for frontend consumption. */
export const publicUser = (identity) => {
  if (!identity) return null;
  const u = identity.get ? identity.get({ plain: true }) : identity;
  
  return {
    id: u.userKey || u.id,
    userKey: u.userKey || u.id,
    sourceId: u.sourceId,
    identityType: u.identityType,
    name: u.displayName || u.name,
    displayName: u.displayName || u.name,
    email: u.email,
    employeeId: u.employeeBusinessId || u.employeeId || null,
    employeeBusinessId: u.employeeBusinessId || null,
    location: u.location || null,
    employee: u.employee || null,
    role: u.role || null,
    roleId: u.roleId || null,
    applicationRole: u.applicationRole || null,
    status: 'Active',
    cmCategories: u.cmCategories || [],
    ciCategories: u.ciCategories || [],
    categoryIds: u.categoryIds || u.ciCategories || u.cmCategories || [],
    initials: initials(u.displayName || u.name || u.email),
    isInUserTable: u.identityType === 'S8_USER'
  };
};

export const publicUserAsync = async (identity) => {
  return publicUser(identity);
};

export const issueToken = (identity) =>
  jwt.sign(
    {
      sub: identity.userKey || identity.id,
      identityType: identity.identityType,
      email: identity.email
    },
    SECRET,
    { expiresIn: EXPIRES_IN }
  );

export const generateTempPassword = () => {
  const words = ['fox', 'change', 'desk', 'north', 'delta', 'quartz', 'ember', 'sable', 'orbit', 'ridge'];
  const w = words[Math.floor(Math.random() * words.length)];
  const n = Math.floor(1000 + Math.random() * 9000);
  return `${w.charAt(0).toUpperCase()}${w.slice(1)}-${n}`;
};

export const verifyToken = (token) => jwt.verify(token, SECRET);

/** Development Email-Only Authentication (No password, no OTP, no dummy lookup) */
export const authenticate = async (email) => {
  if (!email) {
    const e = new Error('Email is required');
    e.statusCode = 400;
    throw e;
  }

  const result = await IdentityResolver.resolveByEmail(email);

  if (result.status === 'NOT_FOUND') {
    const e = new Error('Unknown email address — user not found in directory');
    e.statusCode = 401;
    throw e;
  }

  if (result.status === 'AMBIGUOUS') {
    const e = new Error('Ambiguous email match across directories. Contact support.');
    e.statusCode = 403;
    throw e;
  }

  if (result.status === 'NO_ROLE') {
    const e = new Error('Account has no assigned ChangeDesk application role');
    e.statusCode = 403;
    throw e;
  }

  if (result.status === 'INVALID_ROLE_COMBINATION') {
    const e = new Error('Account has invalid identity and role configuration');
    e.statusCode = 403;
    throw e;
  }

  if (result.status !== 'SUCCESS' || !result.identity) {
    const e = new Error('Authentication failed');
    e.statusCode = 401;
    throw e;
  }

  return result.identity;
};
