'use strict';
/**
 * lib/auth/index.js - Phase 2 authentication core.
 * Per-tenant users with bcrypt password hashing + HS256 JWT sessions + password reset.
 *
 * Builds on the tenant-scoped repository (lib/db, PR #86): users live in the 'users'
 * collection scoped by tenantId, so one tenant's users are isolated from another's.
 *
 * No new heavy deps required: uses bcryptjs (already in repo) and Node's crypto for JWT
 * (compact HS256 implementation) so this works even before `npm i jsonwebtoken`.
 */
const crypto = require('crypto');
let bcrypt = null;
try { bcrypt = require('bcryptjs'); } catch {}
const repo = require('../db');

const JWT_SECRET = process.env.AUTH_JWT_SECRET || process.env.SESSION_SECRET || 'dev-insecure-secret-change-me';
const JWT_TTL_SEC = Number(process.env.AUTH_JWT_TTL_SEC || 7 * 24 * 3600);
const ROLES = ['owner', 'admin', 'agent', 'viewer'];
const ROLE_RANK = { viewer: 0, agent: 1, admin: 2, owner: 3 };

/* ----------------------------- password hashing ----------------------------- */
async function hashPassword(pw) {
  if (!pw || String(pw).length < 8) throw new Error('password must be at least 8 characters');
  if (bcrypt) return bcrypt.hash(String(pw), 10);
  // Fallback: scrypt (still strong) if bcryptjs missing.
  const salt = crypto.randomBytes(16).toString('hex');
  const dk = crypto.scryptSync(String(pw), salt, 64).toString('hex');
  return 'scrypt$' + salt + '$' + dk;
}
async function verifyPassword(pw, stored) {
  if (!stored) return false;
  if (stored.startsWith('scrypt$')) {
    const [, salt, dk] = stored.split('$');
    const calc = crypto.scryptSync(String(pw), salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(calc), Buffer.from(dk));
  }
  return bcrypt ? bcrypt.compare(String(pw), stored) : false;
}

/* --------------------------------- JWT (HS256) -------------------------------- */
const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64urlJSON = (obj) => b64url(JSON.stringify(obj));
function signJWT(payload, ttlSec = JWT_TTL_SEC) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = Object.assign({ iat: now, exp: now + ttlSec }, payload);
  const data = b64urlJSON(header) + '.' + b64urlJSON(body);
  const sig = b64url(crypto.createHmac('sha256', JWT_SECRET).update(data).digest());
  return data + '.' + sig;
}
function verifyJWT(token) {
  if (!token || token.split('.').length !== 3) throw new Error('malformed token');
  const [h, b, sig] = token.split('.');
  const expected = b64url(crypto.createHmac('sha256', JWT_SECRET).update(h + '.' + b).digest());
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) throw new Error('bad signature');
  const body = JSON.parse(Buffer.from(b.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
  if (body.exp && Math.floor(Date.now() / 1000) > body.exp) throw new Error('token expired');
  return body;
}

/* --------------------------------- user model --------------------------------- */
const publicUser = (u) => (u ? { id: u.id, tenantId: u.tenantId, email: u.email, name: u.name, role: u.role, status: u.status, createdAt: u.createdAt } : null);

async function findByEmail(tenantId, email) {
  const rows = await repo.list(tenantId, 'users', { email: String(email || '').toLowerCase().trim() });
  return rows[0] || null;
}

async function signup(tenantId, { email, password, name, role } = {}) {
  repo.assertTenant(tenantId);
  const em = String(email || '').toLowerCase().trim();
  if (!em || !em.includes('@')) throw new Error('valid email required');
  if (await findByEmail(tenantId, em)) throw new Error('email already registered');
  // First user of a tenant becomes owner; others default to agent.
  const existing = await repo.list(tenantId, 'users', {});
  const assignedRole = ROLES.includes(role) ? role : (existing.length === 0 ? 'owner' : 'agent');
  const passwordHash = await hashPassword(password);
  const user = await repo.create(tenantId, 'users', { email: em, name: name || '', role: assignedRole, passwordHash, status: 'active' });
  return { user: publicUser(user), token: signJWT({ sub: user.id, tenantId, role: assignedRole, email: em }) };
}

async function login(tenantId, { email, password } = {}) {
  repo.assertTenant(tenantId);
  const user = await findByEmail(tenantId, email);
  if (!user || user.status !== 'active') throw new Error('invalid credentials');
  if (!(await verifyPassword(password, user.passwordHash))) throw new Error('invalid credentials');
  return { user: publicUser(user), token: signJWT({ sub: user.id, tenantId, role: user.role, email: user.email }) };
}

async function getUserFromToken(token) {
  const body = verifyJWT(token);
  const user = await repo.get(body.tenantId, 'users', body.sub);
  if (!user || user.status !== 'active') throw new Error('user not found or inactive');
  return { user: publicUser(user), claims: body };
}

/* ------------------------------ password reset ------------------------------- */
// Token is random, stored hashed, single-use, short-lived. We return it to the caller
// so the app can deliver via WhatsApp/email - we never log the raw token.
async function requestPasswordReset(tenantId, email) {
  const user = await findByEmail(tenantId, email);
  if (!user) return { ok: true }; // do not reveal existence
  const raw = crypto.randomBytes(24).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
  await repo.update(tenantId, 'users', user.id, { resetTokenHash: tokenHash, resetExpiresAt: new Date(Date.now() + 3600000).toISOString() });
  return { ok: true, resetToken: raw, userId: user.id, expiresInSec: 3600 };
}

async function resetPassword(tenantId, { email, token, newPassword } = {}) {
  const user = await findByEmail(tenantId, email);
  if (!user || !user.resetTokenHash) throw new Error('invalid or expired reset');
  if (user.resetExpiresAt && Date.now() > new Date(user.resetExpiresAt).getTime()) throw new Error('reset token expired');
  const tokenHash = crypto.createHash('sha256').update(String(token || '')).digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(tokenHash), Buffer.from(user.resetTokenHash))) throw new Error('invalid reset token');
  const passwordHash = await hashPassword(newPassword);
  await repo.update(tenantId, 'users', user.id, { passwordHash, resetTokenHash: null, resetExpiresAt: null });
  return { ok: true };
}

/* ----------------------------------- RBAC ------------------------------------ */
function roleAtLeast(role, min) { return (ROLE_RANK[role] || 0) >= (ROLE_RANK[min] || 0); }

async function listUsers(tenantId) { return (await repo.list(tenantId, 'users', {})).map(publicUser); }
async function setRole(tenantId, userId, role) {
  if (!ROLES.includes(role)) throw new Error('invalid role');
  const u = await repo.update(tenantId, 'users', userId, { role });
  return publicUser(u);
}
async function setStatus(tenantId, userId, status) {
  const u = await repo.update(tenantId, 'users', userId, { status });
  return publicUser(u);
}

module.exports = {
  ROLES, ROLE_RANK, roleAtLeast,
  hashPassword, verifyPassword, signJWT, verifyJWT,
  signup, login, getUserFromToken, findByEmail, publicUser,
  requestPasswordReset, resetPassword,
  listUsers, setRole, setStatus,
};
