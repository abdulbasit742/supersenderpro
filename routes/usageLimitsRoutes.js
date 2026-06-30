// routes/usageLimitsRoutes.js — Billing #6: usage metering + plan enforcement.
//
// Wire-up (server.js) — resolve limits from the plan registry for the tenant's plan:
//   const usage = require('./lib/saasBilling/usageLimits');
//   usage.setLimitResolver((tenantId, key) => planLimitForTenant(tenantId, key)); // from planRegistry
//   usage.setEventEmitter((e, ctx) => require('./lib/workflows/workflowEngine').emit(e, ctx));
//   app.use('/api/usage', require('./routes/usageLimitsRoutes'));
//
// Then guard metered actions, e.g. before a broadcast:
//   const c = usage.consume(tenantId, 'socialPostsPerDay', recipients);
//   if (!c.ok) return res.status(402).json({ error:'plan limit reached', ...c });

const express = require('express');
const router = express.Router();

let usage;
try { usage = require('../lib/saasBilling/usageLimits'); } catch { usage = null; }

function ensure(res) {
  if (!usage) { res.status(503).json({ ok: false, error: 'Usage limits not available' }); return false; }
  return true;
}

// Full usage snapshot for a tenant.
router.get('/:tenantId', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, usage: usage.tenantUsage(req.params.tenantId) });
});

// Status for one key. /api/usage/:tenantId/:key
router.get('/:tenantId/:key', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, status: usage.status(req.params.tenantId, req.params.key) });
});

// Check (no consume). Body: { amount? }
router.post('/:tenantId/:key/check', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, ...usage.checkLimit(req.params.tenantId, req.params.key, Number((req.body || {}).amount) || 1) });
});

// Consume. Body: { amount? }
router.post('/:tenantId/:key/consume', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, result: usage.consume(req.params.tenantId, req.params.key, Number((req.body || {}).amount) || 1) });
});

module.exports = router;
