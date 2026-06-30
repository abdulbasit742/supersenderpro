'use strict';
/**
 * teamAccess.js — Team Feature #1: members + role-based access control (RBAC).
 *
 * A real SaaS has more than one user per account. This defines who's on a tenant's team and what
 * they're allowed to do via roles:
 *   owner  — everything, including billing + team management
 *   admin  — manage campaigns/automation/CRM, not billing/team
 *   agent  — work the inbox, send messages, edit contacts; no settings
 *   viewer — read-only
 *
 * Exposes `can(member, permission)` and a `requirePermission(perm)` Express middleware so routes can
 * be locked down consistently. Pairs with inbox assignment (#inbox1) and API key scopes (#api1).
 *
 * Storage: JSON (data/team_members.json).
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'team_members.json');

const ROLES = ['owner', 'admin', 'agent', 'viewer'];

// Permission matrix. '*' = all.
const ROLE_PERMISSIONS = {
  owner:  ['*'],
  admin:  ['campaigns.manage', 'crm.manage', 'automation.manage', 'inbox.work', 'contacts.edit', 'reports.view', 'templates.manage'],
  agent:  ['inbox.work', 'contacts.edit', 'messages.send', 'reports.view'],
  viewer: ['reports.view', 'crm.view', 'inbox.view']
};

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { members: [] }; }
  catch { return { members: [] }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}
const nowIso = () => new Date().toISOString();

function permissionsFor(role) { return ROLE_PERMISSIONS[role] || []; }

/** True if the role grants the permission. */
function roleCan(role, permission) {
  const perms = permissionsFor(role);
  return perms.includes('*') || perms.includes(permission);
}

function invite(opts = {}) {
  if (!opts.tenantId) throw new Error('tenantId required');
  if (!opts.email && !opts.phone) throw new Error('email or phone required');
  const role = ROLES.includes(opts.role) ? opts.role : 'agent';
  const data = load();
  const member = {
    id: `MEM-${Date.now()}-${Math.random().toString(16).slice(2,6)}`,
    tenantId: String(opts.tenantId),
    name: opts.name || '',
    email: opts.email || '',
    phone: opts.phone || '',
    role,
    active: true,
    invitedAt: nowIso()
  };
  data.members.push(member);
  save(data);
  return member;
}

function listMembers(tenantId) {
  const data = load();
  return data.members.filter(m => !tenantId || m.tenantId === String(tenantId));
}
function getMember(id) { return load().members.find(m => m.id === id) || null; }

function setRole(id, role) {
  if (!ROLES.includes(role)) throw new Error(`invalid role. use: ${ROLES.join(', ')}`);
  const data = load();
  const m = data.members.find(x => x.id === id);
  if (!m) return null;
  m.role = role;
  m.updatedAt = nowIso();
  save(data);
  return m;
}

function deactivate(id) {
  const data = load();
  const m = data.members.find(x => x.id === id);
  if (!m) return null;
  m.active = false;
  m.updatedAt = nowIso();
  save(data);
  return m;
}

/** can(memberOrId, permission) */
function can(memberOrId, permission) {
  const m = typeof memberOrId === 'string' ? getMember(memberOrId) : memberOrId;
  if (!m || !m.active) return false;
  return roleCan(m.role, permission);
}

/**
 * Express middleware. Expects req.member (set by your auth layer) or a memberId header.
 * Usage: app.post('/api/campaigns', requirePermission('campaigns.manage'), handler)
 */
function requirePermission(permission) {
  return function (req, res, next) {
    const member = req.member || (req.headers['x-member-id'] ? getMember(req.headers['x-member-id']) : null);
    if (!member) return res.status(401).json({ ok: false, error: 'no team member context' });
    if (!can(member, permission)) return res.status(403).json({ ok: false, error: `missing permission: ${permission}` });
    req.member = member;
    next();
  };
}

module.exports = { ROLES, ROLE_PERMISSIONS, permissionsFor, roleCan, invite, listMembers, getMember, setRole, deactivate, can, requirePermission };
