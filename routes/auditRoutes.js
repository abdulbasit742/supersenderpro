// routes/auditRoutes.js — Audit #1: query the audit trail.
//
// Wire-up (server.js):
//   const audit = require('./lib/audit/auditLog');
//   app.use('/api', audit.middleware());   // auto-log all mutating /api calls
//   app.use('/api/audit', require('./routes/auditRoutes'));
//   // and record domain events explicitly where useful, e.g.:
//   //   audit.record({ tenantId, actor, action:'campaign.delete', target: campaignId });

const express = require('express');
const router = express.Router();

let audit;
try { audit = require('../lib/audit/auditLog'); } catch { audit = null; }

function ensure(res) {
  if (!audit) { res.status(503).json({ ok: false, error: 'Audit log not available' }); return false; }
  return true;
}

// Query. Query params: ?tenantId=&actorId=&action=&since=&limit=
router.get('/', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, entries: audit.query(req.query) });
});

// Stats (action counts).
router.get('/stats', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, stats: audit.stats() });
});

// Record an explicit domain event. Body: { tenantId?, actor, action, target?, meta? }
router.post('/', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, entry: audit.record(req.body || {}) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

module.exports = router;
