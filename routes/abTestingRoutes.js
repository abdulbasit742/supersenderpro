// routes/abTestingRoutes.js — REST surface for A/B Testing. Mount at /api/ab-testing.

const express = require('express');
const router = express.Router();

let ab = null; try { ab = require('../lib/abTesting'); } catch (e) { ab = null; }
function guard(req, res) { if (!ab) { res.status(503).json({ ok: false, error: 'ab testing not available' }); return false; } return true; }

router.get('/status', (req, res) => {
 if (!ab) return res.json({ ok: false, error: 'ab testing not loaded' });
 const r = ab.doctor.run(); res.json({ ok: true, posture: r.posture, counts: r.counts });
});
router.get('/doctor', (req, res) => { if (!guard(req, res)) return; res.json(ab.doctor.run()); });
router.get('/overview', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, ...ab.experimentEngine.overview() }); });

// Experiments
router.post('/experiments', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, experiment: ab.experimentEngine.create(req.body || {}) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.get('/experiments', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, items: ab.experimentEngine.list({ status: req.query.status }) }); });
router.get('/experiments/:id', (req, res) => { if (!guard(req, res)) return; const e = ab.experimentEngine.get(req.params.id); if (!e) return res.status(404).json({ ok: false, error: 'experiment not found' }); res.json({ ok: true, experiment: e }); });
router.post('/experiments/:id/stop', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, experiment: ab.experimentEngine.stop(req.params.id, req.body || {}) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.post('/experiments/:id/archive', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, experiment: ab.experimentEngine.archive(req.params.id) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });

// Send-time: get the variant body for a contact. Body/query: { contact }
router.post('/experiments/:id/variant', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, ...ab.experimentEngine.variantFor(req.params.id, (req.body || {}).contact) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
// Outcome: record a conversion for the contact's assigned variant.
router.post('/experiments/:id/convert', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, ...ab.experimentEngine.recordConversion(req.params.id, (req.body || {}).contact) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });

module.exports = router;
