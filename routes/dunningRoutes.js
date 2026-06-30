// routes/dunningRoutes.js — Payments & Billing #4: dunning (failed-payment recovery).
//
// Wire-up (server.js):
//   const dunning = require('./lib/saasBilling/dunningEngine');
//   dunning.setSender(async (customer, { text }) => sendWhatsApp(customer.phone, text));
//   dunning.setOnExhausted((c) => subs.cancel(c.customer, c.planId, { immediate: true }));
//   // open a case when a subscription goes past_due:
//   subs.setHooks({ onPastDue: (s) => dunning.openCase(s.customer, s.planId, { planName: s.planId }) });
//   // resolve when a past_due plan pays again (from fulfillment #1):
//   // dunning.resolveCase(customer, planId)
//   require('node-cron').schedule('0 * * * *', () => dunning.tick().catch(()=>{}));
//   app.use('/api/dunning', require('./routes/dunningRoutes'));

const express = require('express');
const router = express.Router();

let dunning;
try { dunning = require('../lib/saasBilling/dunningEngine'); } catch { dunning = null; }

function ensure(res) {
  if (!dunning) { res.status(503).json({ ok: false, error: 'Dunning engine not available' }); return false; }
  return true;
}

// List cases. Query: ?status=open|resolved|exhausted
router.get('/', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, cases: dunning.listCases({ status: req.query.status }) });
});

// Recovery stats (how much involuntary churn you're saving).
router.get('/stats', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, stats: dunning.getStats() });
});

// Manually open a case. Body: { customer, planId, planName? }
router.post('/open', (req, res) => {
  if (!ensure(res)) return;
  try {
    const { customer, planId, planName } = req.body || {};
    res.json({ ok: true, case: dunning.openCase(customer, planId, { planName }) });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Manually resolve (payment recovered). Body: { customer, planId }
router.post('/resolve', (req, res) => {
  if (!ensure(res)) return;
  const { customer, planId } = req.body || {};
  const c = dunning.resolveCase(customer, planId);
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
