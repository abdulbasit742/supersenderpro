// routes/dunningRoutes.js — Payments & Billing #4: dunning (failed-payment recovery).
//
// Wire-up (server.js):
//   const dunning = require('./lib/saasBilling/dunningEngine');
//   dunning.setSender(async (contact, { text }) => {
//     const to = String(contact.phone).includes('@') ? contact.phone : `${contact.phone}@c.us`;
//     await waClient.sendMessage(to, text);
//   });
//   require('node-cron').schedule('0 * * * *', () => dunning.tick().catch(()=>{}));
//   app.use('/api/dunning', require('./routes/dunningRoutes'));
//
// Tie into lifecycle #2: in subs.setHooks({ onPastDue: (s) => dunning.openCase(s.customer, s.planId) })
// and when a payment is recovered (fulfillment #1) call dunning.resolveCase(customer, planId).

const express = require('express');
const router = express.Router();

let dunning;
try { dunning = require('../lib/saasBilling/dunningEngine'); } catch { dunning = null; }

function ensure(res) {
  if (!dunning) { res.status(503).json({ ok: false, error: 'Dunning engine not available' }); return false; }
  return true;
}

// List cases. Query: ?status=open|recovered|exhausted|cancelled
router.get('/', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, cases: dunning.listCases({ status: req.query.status }) });
});

// Open a case manually. Body: { customer, planId, name? }
router.post('/open', (req, res) => {
  if (!ensure(res)) return;
  try {
    const { customer, planId, name } = req.body || {};
    res.json({ ok: true, case: dunning.openCase(customer, planId, { name }) });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Mark recovered. Body: { customer, planId }
router.post('/resolve', (req, res) => {
  if (!ensure(res)) return;
  const { customer, planId } = req.body || {};
  const c = dunning.resolveCase(customer, planId);
  if (!c) return res.status(404).json({ ok: false, error: 'No open case' });
  res.json({ ok: true, case: c });
});

// Cancel a case. Body: { customer, planId }
router.post('/cancel', (req, res) => {
  if (!ensure(res)) return;
  const { customer, planId } = req.body || {};
  const c = dunning.cancelCase(customer, planId);
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
