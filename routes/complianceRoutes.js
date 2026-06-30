// routes/complianceRoutes.js — Compliance #1: consent + suppression.
//
// Wire-up (server.js) — make the send guard consult the ledger so NOTHING goes to a suppressed number:
//   const consent = require('./lib/compliance/consentLedger');
//   require('./lib/sending/sendGuard').setOptOutCheck((phone) => consent.canSend(phone));
//   app.use('/api/compliance', require('./routes/complianceRoutes'));
//
// And in the inbound router's opt-out branch, also call consent.optOut(phone, { source:'keyword' }).

const express = require('express');
const router = express.Router();

let consent;
try { consent = require('../lib/compliance/consentLedger'); } catch { consent = null; }

function ensure(res) {
  if (!consent) { res.status(503).json({ ok: false, error: 'Compliance not available' }); return false; }
  return true;
}

// Opt out / opt in. Body: { phone, reason?, source? }
router.post('/opt-out', (req, res) => {
  if (!ensure(res)) return;
  const { phone, reason, source } = req.body || {};
  try { res.json({ ok: true, entry: consent.optOut(phone, { reason, source }) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});
router.post('/opt-in', (req, res) => {
  if (!ensure(res)) return;
  const { phone, reason, source } = req.body || {};
  try { res.json({ ok: true, entry: consent.optIn(phone, { reason, source }) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Can this number be contacted?
router.get('/can-send/:phone', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, canSend: consent.canSend(req.params.phone) });
});

// Consent history for a number (audit).
router.get('/history/:phone', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, history: consent.history(req.params.phone) });
});

// Suppression list + stats.
router.get('/suppressed', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, suppressed: consent.listSuppressed(), stats: consent.stats() });
});

// Bulk import suppression. Body: { numbers: [..], source? }
router.post('/suppressed/import', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, ...consent.importSuppression((req.body || {}).numbers || [], (req.body || {}).source) });
});

module.exports = router;
