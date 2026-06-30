// routes/dunningRoutes.js — Payments & Billing #4: dunning (failed-payment recovery).
//
// Wire-up (server.js):
//   const dunning = require('./lib/saasBilling/dunningEngine');
//   dunning.setSender(async (customer, { text }) => sendWhatsApp(customer.phone, text)); // reuse your sender
//   dunning.setCharger(async (c) => retryCharge(c.customer, c.planId, c.amount));        // optional auto-retry
//   dunning.setHooks({ onGaveUp: (c) => subs.cancel(c.customer, c.planId, { immediate:true }) });
//   require('node-cron').schedule('0 * * * *', () => dunning.tick().catch(()=>{}));
//   app.use('/api/dunning', require('./routes/dunningRoutes'));
//
// Tie-in: from subscription #2 onPastDue -> dunning.openCase(customer, planId, { amount }).
// And from fulfillment #1 on a successful payment -> dunning.resolveCase(customer, planId).

const express = require('express');
const router = express.Router();

let dunning;
try { dunning = require('../lib/saasBilling/dunningEngine'); } catch { dunning = null; }

function ensure(res) {
  if (!dunning) { res.status(503).json({ ok: false, error: 'Dunning engine not available' }); return false; }
  return true;
}

// Open a case manually. Body: { customer, planId, amount? }
router.post('/', (req, res) => {
  if (!ensure(res)) return;
  try {
    const { customer, planId, amount } = req.body || {};
    res.json({ ok: true, case: dunning.openCase(customer, planId, { amount }) });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// List cases. Query: ?status=open|recovered|gave_up
router.get('/', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, cases: dunning.listCases({ status: req.query.status }) });
});

// Mark a case recovered (payment came through). Body: { customer, planId }
router.post('/resolve', async (req, res) => {
  if (!ensure(res)) return;
  const { customer, planId } = req.body || {};
  const c = await dunning.resolveCase(customer, planId);
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
