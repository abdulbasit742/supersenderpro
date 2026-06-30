// routes/audienceSegmentsRoutes.js — REST surface for Audience Segments. Mount at /api/audience-segments.

const express = require('express');
const router = express.Router();

let as = null; try { as = require('../lib/audienceSegments'); } catch (e) { as = null; }
function guard(req, res) { if (!as) { res.status(503).json({ ok: false, error: 'audience segments not available' }); return false; } return true; }

router.get('/status', (req, res) => {
 if (!as) return res.json({ ok: false, error: 'audience segments not loaded' });
 const r = as.doctor.run(); res.json({ ok: true, posture: r.posture, source: r.source, counts: r.counts });
});
router.get('/doctor', (req, res) => { if (!guard(req, res)) return; res.json(as.doctor.run()); });

// Segment CRUD
router.get('/segments', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, items: as.segmentStore.all() }); });
router.get('/segments/:id', (req, res) => { if (!guard(req, res)) return; const s = as.segmentStore.get(req.params.id); if (!s) return res.status(404).json({ ok: false, error: 'segment not found' }); res.json({ ok: true, segment: s }); });
router.post('/segments', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, segment: as.segmentStore.upsert(req.body || {}) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.post('/segments/:id/active', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, segment: as.segmentStore.setActive(req.params.id, (req.body || {}).active) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });

// Evaluate
router.get('/segments/:id/preview', async (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, ...(await as.evaluator.preview(req.params.id, { sample: Number(req.query.sample) || 10 })) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.get('/segments/:id/resolve', async (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, ...(await as.evaluator.resolve(req.params.id, { limit: Number(req.query.limit) || undefined })) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });

// Test an ad-hoc, unsaved rule set
router.post('/test', async (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, ...(await as.evaluator.test(req.body || {}, { sample: Number((req.body || {}).sample) || 10 })) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });

module.exports = router;
