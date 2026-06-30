// routes/abTestRoutes.js — Marketing #6: A/B testing.
//
// Wire-up (server.js):
//   app.use('/api/marketing/ab', require('./routes/abTestRoutes'));
//
// Sending flow: for each contact, const { key, body } = ab.pickVariant(testId, phone); send body;
//   ab.record(testId, key, 'sent'); later ab.record(testId, key, 'conversion') on order.

const express = require('express');
const router = express.Router();

let ab;
try { ab = require('../lib/marketing/abTesting'); } catch { ab = null; }

function ensure(res) {
  if (!ab) { res.status(503).json({ ok: false, error: 'A/B testing not available' }); return false; }
  return true;
}

// Create. Body: { name, variants:[{body},{body}], split? }
router.post('/', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, test: ab.createTest(req.body || {}) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

router.get('/', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, tests: ab.listTests() });
});

router.get('/:id', (req, res) => {
  if (!ensure(res)) return;
  const t = ab.getTest(req.params.id);
  if (!t) return res.status(404).json({ ok: false, error: 'Test not found' });
  res.json({ ok: true, test: t, analysis: ab.analyze(req.params.id) });
});

// Pick a variant for a contact. Query: ?contact=
router.get('/:id/variant', (req, res) => {
  if (!ensure(res)) return;
  const v = ab.pickVariant(req.params.id, req.query.contact || '');
  if (!v) return res.status(404).json({ ok: false, error: 'Test not found' });
  res.json({ ok: true, variant: v });
});

// Record an event. Body: { variantKey, type }
router.post('/:id/event', (req, res) => {
  if (!ensure(res)) return;
  const { variantKey, type } = req.body || {};
  try {
    const s = ab.record(req.params.id, variantKey, type);
    if (!s) return res.status(404).json({ ok: false, error: 'Test/variant not found' });
    res.json({ ok: true, stats: s });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Declare winner. Body: { variantKey? } (auto-picks leader if omitted)
router.post('/:id/winner', (req, res) => {
  if (!ensure(res)) return;
  const t = ab.declareWinner(req.params.id, (req.body || {}).variantKey);
  if (!t) return res.status(400).json({ ok: false, error: 'Could not declare winner (no test or no data)' });
  res.json({ ok: true, test: t });
});

module.exports = router;
