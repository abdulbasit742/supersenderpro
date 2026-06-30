// routes/usageRoutes.js — Billing #6: usage metering + enforcement.
//
// Wire-up (server.js) — resolve plan limits from the plan registry + a tenant's plan:
//   const usage = require('./lib/saasBilling/usageMeter');
//   usage.setPlanResolver((tenantId) => {
//     const planId = getTenantPlanId(tenantId);                 // your tenant->plan lookup
//     const plan = require('./lib/saasBilling/planRegistry').getPlan?.(planId);
//     return { limits: (plan && plan.limits) || {} };
//   });
//   app.use('/api/usage', require('./routes/usageRoutes'));
//
// Then guard metered actions, e.g. before a broadcast:
//   const v = usage.consume(tenantId, 'socialPostsPerDay', 1);
//   if (!v.allowed) return res.status(402).json({ ok:false, error:'plan limit reached', ...v });

const express = require('express');
const router = express.Router();

let usage;
try { usage = require('../lib/saasBilling/usageMeter'); } catch { usage = null; }

function ensure(res) {
  if (!usage) { res.status(503).json({ ok: false, error: 'Usage meter not available' }); return false; }
  return true;
}

// Snapshot for a tenant.
router.get('/:tenantId', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, usage: usage.snapshot(req.params.tenantId) });
});

// Check remaining without consuming. Query: ?key=&n=
router.get('/:tenantId/check', (req, res) => {
  if (!ensure(res)) return;
  if (!req.query.key) return res.status(400).json({ ok: false, error: 'key required' });
  res.json({ ok: true, ...usage.check(req.params.tenantId, req.query.key, Number(req.query.n) || 1) });
});

// Consume. Body: { key, n? }
router.post('/:tenantId/consume', (req, res) => {
  if (!ensure(res)) return;
  const { key, n } = req.body || {};
  if (!key) return res.status(400).json({ ok: false, error: 'key required' });
  const v = usage.consume(req.params.tenantId, key, Number(n) || 1);
  res.status(v.allowed ? 200 : 402).json({ ok: v.allowed, ...v });
});

module.exports = router;
