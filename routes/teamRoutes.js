// routes/teamRoutes.js — Team #1: members + RBAC.
//
// Wire-up (server.js):
//   app.use('/api/team', require('./routes/teamRoutes'));
//   // protect sensitive routes elsewhere, e.g.:
//   const { requirePermission } = require('./lib/team/teamAccess');
//   app.post('/api/marketing/segments', requirePermission('campaigns.manage'), ...);

const express = require('express');
const router = express.Router();

let team;
try { team = require('../lib/team/teamAccess'); } catch { team = null; }

function ensure(res) {
  if (!team) { res.status(503).json({ ok: false, error: 'Team access not available' }); return false; }
  return true;
}

// Roles + their permissions (for building a roles UI).
router.get('/roles', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, roles: team.ROLES, permissions: team.ROLE_PERMISSIONS });
});

// List members for a tenant. Query: ?tenantId=
router.get('/', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, members: team.listMembers(req.query.tenantId) });
});

// Invite a member. Body: { tenantId, name?, email?, phone?, role? }
router.post('/', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, member: team.invite(req.body || {}) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Change role. Body: { role }
router.post('/:id/role', (req, res) => {
  if (!ensure(res)) return;
  try {
    const m = team.setRole(req.params.id, (req.body || {}).role);
    if (!m) return res.status(404).json({ ok: false, error: 'Member not found' });
    res.json({ ok: true, member: m });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Deactivate.
router.post('/:id/deactivate', (req, res) => {
  if (!ensure(res)) return;
  const m = team.deactivate(req.params.id);
  if (!m) return res.status(404).json({ ok: false, error: 'Member not found' });
  res.json({ ok: true, member: m });
});

// Check a permission. Query: ?memberId=&permission=
router.get('/can', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, allowed: team.can(req.query.memberId, req.query.permission) });
});

module.exports = router;
