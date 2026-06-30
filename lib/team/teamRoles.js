'use strict';
/**
 * teamRoles.js — Team Feature #1: members + role-based access control (RBAC).
 *
 * A multi-user SaaS needs to say who can do what. This defines team members per tenant and a clear
 * role -> permission matrix. Other modules ask `can(memberId, 'permission')` (or use the Express
 * middleware) before allowing an action — e.g. only admins change billing, agents only handle inbox.
 *
 * Roles (most -> least powerful): owner > admin > agent > viewer.
 * Storage: JSON (data/team_members.json).
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'team_members.json');

const ROLES = ['owner', 'admin', 'agent', 'viewer'];

// Permission matrix. 'manage_*' = settings-level; 'use_*' = day-to-day.
const PERMISSIONS = {
  owner:  ['*'],
  admin:  ['manage_team', 'manage_billing', 'manage_templates', 'manage_workflows', 'manage_campaigns',
           'use_inbox', 'use_broadcast', 'send_message', 'read_reports', 'manage_contacts'],
  agent:  ['use_inbox', 'send_message', 'read_reports', 'manage_contacts'],
  viewer: ['read_reports']
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

function roleAllows(role, permission) {
  const perms = PERMISSIONS[role] || [];
  return perms.includes('*') || perms.includes(permission);
}

function addMember(opts = {}) {
  if (!opts.tenantId) throw new Error('tenantId required');
  if (!opts.email && !opts.userId) throw new Error('member needs an email or userId');
  const role = ROLES.includes(opts.role) ? opts.role : 'agent';
  const data = load();
  const member = {
    id: `MEM-${Date.now()}-${Math.random().toString(16).slice(2,6)}`,
    tenantId: String(opts.tenantId),
    userId: opts.userId || null,
    name: opts.name || '',
    email: opts.email || '',
    role,
    status: 'invited',          // invited | active | disabled
    invitedAt: nowIso(),
    updatedAt: nowIso()
  };
  data.members.push(member);
  save(data);
  return member;
}

function listMembers(tenantId) {
  return load().members.filter(m => !tenantId || m.tenantId === String(tenantId));
}
function getMember(id) { return load().members.find(m => m.id === id) || null; }

function countOwners(data, tenantId) {
  return data.members.filter(m => m.tenantId === tenantId && m.role === 'owner' && m.status !== 'disabled').length;
}

function updateMember(id, patch = {}) {
  const data = load();
  const m = data.members.find(x => x.id === id);
  if (!m) return null;
  // protect the last owner from being downgraded
  if (patch.role && patch.role !== 'owner' && m.role === 'owner' && countOwners(data, m.tenantId) <= 1) {
    throw new Error('cannot downgrade the last owner');
  }
  if (patch.role && ROLES.includes(patch.role)) m.role = patch.role;
  if (patch.name !== undefined) m.name = patch.name;
  if (patch.status && ['invited', 'active', 'disabled'].includes(patch.status)) m.status = patch.status;
  m.updatedAt = nowIso();
  save(data);
  return m;
}

function removeMember(id) {
  const data = load();
  const m = data.members.find(x => x.id === id);
  if (!m) return { deleted: 0 };
  if (m.role === 'owner' && countOwners(data, m.tenantId) <= 1) throw new Error('cannot remove the last owner');
  data.members = data.members.filter(x => x.id !== id);
  save(data);
  return { deleted: 1 };
}

/** Can this member do this permission? */
function can(memberId, permission) {
  const m = getMember(memberId);
  if (!m || m.status === 'disabled') return false;
  return roleAllows(m.role, permission);
}

/** Express middleware: requirePermission('use_inbox'). Expects req.member or x-member-id header. */
function requirePermission(permission) {
  return function (req, res, next) {
    const memberId = (req.member && req.member.id) || req.headers['x-member-id'];
    if (!memberId || !can(memberId, permission)) {
      return res.status(403).json({ ok: false, error: `permission denied: ${permission}` });
    }
    next();
  };
}

module.exports = { ROLES, PERMISSIONS, addMember, listMembers, getMember, updateMember, removeMember, can, roleAllows, requirePermission };
