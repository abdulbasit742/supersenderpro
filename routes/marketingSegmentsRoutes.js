// routes/marketingSegmentsRoutes.js — Marketing Automation #1: segment management + preview.
//
// Wire-up (server.js):
//   app.use('/api/marketing/segments', require('./routes/marketingSegmentsRoutes'));
//
// Preview uses your existing CRM contacts. Pass a loader so this route doesn't hard-depend on a
// specific storage layer. If none is wired, /preview falls back to an empty list (and says so).

const express = require('express');
const router = express.Router();

let engine;
try { engine = require('../lib/marketing/segmentEngine'); } catch { engine = null; }

// Optional: let server.js inject how to fetch contacts for a store.
//   segmentsRouter.setContactLoader((storeId) => [...contacts])
let contactLoader = null;
router.setContactLoader = (fn) => { contactLoader = typeof fn === 'function' ? fn : null; };

function ensure(res) {
  if (!engine) { res.status(503).json({ ok: false, error: 'Segment engine not available' }); return false; }
  return true;
}

// List segments (optionally by store).
router.get('/', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, segments: engine.listSegments(req.query.storeId) });
});

// Operators reference (handy for building a rule UI).
router.get('/operators', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, operators: engine.VALID_OPS });
});

// Create a segment. Body: { storeId?, name, rules:[{field,op,value}], match?: 'all'|'any' }
router.post('/', (req, res) => {
  if (!ensure(res)) return;
  try {
    const { storeId, name, rules, match } = req.body || {};
    const seg = engine.createSegment(storeId, name, rules || [], match);
    res.json({ ok: true, segment: seg });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

router.get('/:id', (req, res) => {
  if (!ensure(res)) return;
  const seg = engine.getSegment(req.params.id);
  if (!seg) return res.status(404).json({ ok: false, error: 'Segment not found' });
  res.json({ ok: true, segment: seg });
});

router.put('/:id', (req, res) => {
  if (!ensure(res)) return;
  try {
    const seg = engine.updateSegment(req.params.id, req.body || {});
    if (!seg) return res.status(404).json({ ok: false, error: 'Segment not found' });
    res.json({ ok: true, segment: seg });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

router.delete('/:id', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, ...engine.deleteSegment(req.params.id) });
});

// Live preview: who is in this segment right now? Pulls contacts via the injected loader.
router.get('/:id/preview', (req, res) => {
  if (!ensure(res)) return;
  const seg = engine.getSegment(req.params.id);
  if (!seg) return res.status(404).json({ ok: false, error: 'Segment not found' });
  if (!contactLoader) {
    return res.json({ ok: true, segment: seg, count: 0, contacts: [], note: 'No contact loader wired; see docs/marketing/01-segments.md' });
  }
  try {
    const contacts = contactLoader(seg.storeId) || [];
    const result = engine.resolveSegmentContacts(seg.id, contacts);
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    res.json({ ok: true, segment: seg, count: result.count, contacts: result.contacts.slice(0, limit) });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
