// routes/abTestingRoutes.js — Marketing #6: A/B testing.
//
// Wire-up (server.js):
//   app.use('/api/marketing/ab', require('./routes/abTestingRoutes'));
//
// In a broadcast/drip send loop, choose copy per contact:
//   const v = ab.pickVariant(testId, phone); const body = v ? v.body : defaultBody;
//   ab.record(testId, v.key, 'sent');  // and 'conversion' later when they buy

const express = require('express');
const router = express.Router();

let ab;
try { ab = require('../lib/marketing/abTesting'); } catch { ab = null; }

function ensure(res) {
  if (!ab) { res.status(503).json({ ok: false, error: 'A/B testing not available' }); return false; }
  return true;
}

// Create. Body: { name, variants:[{body}], split? }
router.post('/', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, test: ab.createTest(req.body || {}) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

router.get('/', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, tests: ab.listTests() });
});

// Results (winner by conversion rate).
router.get('/:id/results', (req, res) => {
  if (!ensure(res)) return;
  const r = ab.results(req.params.id);
  if (!r) return res.status(404).json({ ok: false, error: 'Test not found' });
  res.json({ ok: true, ...r });
});

// Pick a variant for a contact. Query: ?contact=
router.get('/:id/pick', (req, res) => {
  if (!ensure(res)) return;
  const v = ab.pickVariant(req.params.id, req.query.contact || '');
  if (!v) return res.status(404).json({ ok: false, error: 'Test not running' });
  res.json({ ok: true, variant: v });
});

// Record an event. Body: { variantKey, type, revenue? }
router.post('/:id/event', (req, res) => {
  if (!ensure(res)) return;
  const { variantKey, type, revenue } = req.body || {};
  const m = ab.record(req.params.id, variantKey, type, revenue);
  if (!m) return res.status(404).json({ ok: false, error: 'Test/variant not found' });
  res.json({ ok: true, metrics: m });
});

// Stop a test.
router.post('/:id/stop', (req, res) => {
  if (!ensure(res)) return;
  const t = ab.stopTest(req.params.id);
  if (!t) return res.status(404).json({ ok: false, error: 'Test not found' });
  res.json({ ok: true, test: t });
});

module.exports = router;
