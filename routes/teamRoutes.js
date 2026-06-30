// routes/teamRoutes.js — Team #1: members + RBAC.
//
// Wire-up (server.js):
//   app.use('/api/team', require('./routes/teamRoutes'));
//   // gate sensitive routes elsewhere, e.g.:
//   //   const team = require('./lib/team/teamRoles');
//   //   app.use('/api/marketing', team.requirePermission('manage_campaigns'), marketingRouter);

const express = require('express');
const router = express.Router();

let team;
try { team = require('../lib/team/teamRoles'); } catch { team = null; }

function ensure(res) {
  if (!team) { res.status(503).json({ ok: false, error: 'Team module not available' }); return false; }
  return true;
}

// Roles + permission matrix (for building a roles UI).
router.get('/roles', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, roles: team.ROLES, permissions: team.PERMISSIONS });
});

// List members. Query: ?tenantId=
router.get('/', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, members: team.listMembers(req.query.tenantId) });
});

// Invite/add. Body: { tenantId, email|userId, name?, role? }
router.post('/', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, member: team.addMember(req.body || {}) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Update role/status/name. Body: { role?, status?, name? }
router.put('/:id', (req, res) => {
  if (!ensure(res)) return;
  try {
    const m = team.updateMember(req.params.id, req.body || {});
    if (!m) return res.status(404).json({ ok: false, error: 'Member not found' });
    res.json({ ok: true, member: m });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Remove.
router.delete('/:id', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, ...team.removeMember(req.params.id) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Check a permission. Query: ?memberId=&permission=
router.get('/can', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, allowed: team.can(req.query.memberId, req.query.permission) });
});

module.exports = router;
