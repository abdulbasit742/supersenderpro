// routes/marketingSegmentRoutes.js — Marketing Automation #1: segment REST surface.
//
// Wire-up in server.js (after the CRM/contacts are available):
//   const segmentEngine = require('./lib/marketing/segmentEngine');
//   segmentEngine.setContactSource(() => customers); // the app's live contacts array/source
//   app.use('/api/marketing/segments', require('./routes/marketingSegmentRoutes'));

const express = require('express');
const router = express.Router();

let seg;
try { seg = require('../lib/marketing/segmentEngine'); } catch { seg = null; }
function ok(res) { if (!seg) { res.status(503).json({ ok: false, error: 'Segment engine unavailable' }); return false; } return true; }

// List segments (optional ?storeId=)
router.get('/', (req, res) => {
  if (!ok(res)) return;
  res.json({ ok: true, segments: seg.listSegments(req.query.storeId) });
});

// Create a segment: { name, rules, description?, storeId? }
router.post('/', (req, res) => {
  if (!ok(res)) return;
  try {
    const { name, rules, description, storeId } = req.body || {};
    res.json({ ok: true, segment: seg.createSegment(name, rules, { description, storeId }) });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Preview an ad-hoc rule tree (no save): { rules }
router.post('/preview', async (req, res) => {
  if (!ok(res)) return;
  try {
    const result = await seg.previewRules((req.body || {}).rules);
    res.json({ ok: true, ...result });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Resolve a saved segment to live matching contacts
router.get('/:id/evaluate', async (req, res) => {
  if (!ok(res)) return;
  try {
    res.json({ ok: true, ...(await seg.evaluateSegment(req.params.id)) });
  } catch (e) { res.status(404).json({ ok: false, error: e.message }); }
});

router.put('/:id', (req, res) => {
  if (!ok(res)) return;
  const updated = seg.updateSegment(req.params.id, req.body || {});
  if (!updated) return res.status(404).json({ ok: false, error: 'segment not found' });
  res.json({ ok: true, segment: updated });
});

router.delete('/:id', (req, res) => {
  if (!ok(res)) return;
  res.json({ ok: true, ...seg.deleteSegment(req.params.id) });
});

module.exports = router;
