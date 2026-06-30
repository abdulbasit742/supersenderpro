// routes/auditRoutes.js — Audit #1: query the audit trail.
//
// Wire-up (server.js):
//   const audit = require('./lib/audit/auditLog');
//   app.use(audit.middleware());                 // auto-logs all mutating requests
//   app.use('/api/audit', require('./routes/auditRoutes'));
//
// Protect this route with requirePermission('reports.view') or owner-only in your app.

const express = require('express');
const router = express.Router();

let audit;
try { audit = require('../lib/audit/auditLog'); } catch { audit = null; }

router.get('/', (req, res) => {
  if (!audit) return res.status(503).json({ ok: false, error: 'Audit log not available' });
  const filter = {
    tenantId: req.query.tenantId,
    actorId: req.query.actorId,
    action: req.query.action,
    since: req.query.since,
    until: req.query.until,
    limit: req.query.limit
  };
  res.json({ ok: true, entries: audit.query(filter) });
});

// Manual record (for server-side actions that aren't HTTP). Body: { tenantId, actor, action, target?, meta? }
router.post('/', (req, res) => {
  if (!audit) return res.status(503).json({ ok: false, error: 'Audit log not available' });
  res.json({ ok: true, entry: audit.record(req.body || {}) });
});

module.exports = router;
