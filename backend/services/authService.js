// ────────────────────────────────────────────────────────────────
//  Auth service – email/password login that issues a session JWT.
//
//  When Microsoft Entra ID (Azure AD) SSO is added later, the OAuth
//  callback just needs to resolve/create a `users` row and call
//  `issueToken(user)` — the rest of the app is unchanged.
// ────────────────────────────────────────────────────────────────
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import { User, Role } from '../models/index.js';

const SECRET = process.env.JWT_SECRET || 'dev-change-desk-secret';
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const withRole = { include: [{ model: Role, as: 'role', attributes: ['id', 'name'] }] };

const initials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('') || 'U';

/** Everything the frontend is allowed to see about a user. */
export const publicUser = (row) => {
  const u = row?.get ? row.get({ plain: true }) : row;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    department: u.department,
    role: u.role?.name ?? null,
    status: u.status,
    initials: initials(u.name)
  };
};

export const issueToken = (user) =>
  jwt.sign({ sub: user.id, name: user.name }, SECRET, { expiresIn: EXPIRES_IN });

export const verifyToken = (token) => jwt.verify(token, SECRET); // throws if invalid/expired

/** Human-typeable temporary password for freshly invited users. */
export const generateTempPassword = () => {
  const words = ['fox', 'change', 'desk', 'north', 'delta', 'quartz', 'ember', 'sable', 'orbit', 'ridge'];
  const w = words[Math.floor(Math.random() * words.length)];
  const n = Math.floor(1000 + Math.random() * 9000);
  return `${w.charAt(0).toUpperCase()}${w.slice(1)}-${n}`;
};

export const findUserById = (id) => User.findByPk(id, withRole);

export const authenticate = async (email, password) => {
  if (!email || !password) {
    const e = new Error('Email and password are required');
    e.statusCode = 400;
    throw e;
  }

  const user = await User.findOne({
    where: { email: { [Op.iLike]: String(email).trim() } },
    ...withRole
  });

  const ok = user && user.passwordHash && (await bcrypt.compare(password, user.passwordHash));
  if (!ok) {
    const e = new Error('Invalid email or password');
    e.statusCode = 401;
    throw e;
  }

  if (String(user.status).toLowerCase() === 'inactive') {
    const e = new Error('This account is inactive — contact an administrator');
    e.statusCode = 403;
    throw e;
  }

  return user;
};
