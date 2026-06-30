// routes/dunningRoutes.js — Payments & Billing #4: dunning (failed-payment recovery).
//
// Wire-up (server.js):
//   const dunning = require('./lib/saasBilling/dunningEngine');
//   dunning.setHooks({
//     notify: ({ case:c, message }) => waSend(c.customer.phone, message),     // remind/final_notice
//     retryCharge: async ({ case:c }) => attemptRecurringCharge(c.customer, c.planId), // truthy=paid
//     onRecover: ({ case:c }) => subs.renew(c.customer, c.planId),            // payments #2
//     onGiveUp:  ({ case:c }) => subs.cancel(c.customer, c.planId, { immediate:true }),
//   });
//   require('node-cron').schedule('0 9 * * *', () => dunning.tick().catch(()=>{})); // daily 9am
//   app.use('/api/dunning', require('./routes/dunningRoutes'));
//
// Trigger: in subscription #2's onPastDue hook, call dunning.openCase(customer, planId).

const express = require('express');
const router = express.Router();

let dunning;
try { dunning = require('../lib/saasBilling/dunningEngine'); } catch { dunning = null; }

function ensure(res) {
  if (!dunning) { res.status(503).json({ ok: false, error: 'Dunning engine not available' }); return false; }
  return true;
}

// Open a case manually (normally triggered by subscription past_due). Body: { customer, planId, meta? }
router.post('/cases', (req, res) => {
  if (!ensure(res)) return;
  const { customer, planId, meta } = req.body || {};
  if (!customer || !planId) return res.status(400).json({ ok: false, error: 'customer and planId required' });
  res.json({ ok: true, case: dunning.openCase(customer, planId, meta || {}) });
});

// List cases. Query: ?status=open|recovered|failed
router.get('/cases', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, cases: dunning.listCases(req.query.status) });
});

// Recovery stats (open / recovered / failed / recovery rate).
router.get('/stats', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, stats: dunning.stats() });
});

// Mark a case resolved manually (e.g. customer paid out-of-band). Body: { customer, planId, status? }
router.post('/cases/resolve', (req, res) => {
  if (!ensure(res)) return;
  const { customer, planId, status } = req.body || {};
  const c = dunning.resolveCase(customer, planId, status || 'recovered');
  if (!c) return res.status(404).json({ ok: false, error: 'No open case' });
  res.json({ ok: true, case: c });
});

// Run the dunning sweep once (testing).
router.post('/tick', async (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, result: await dunning.tick() }); }
  catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
