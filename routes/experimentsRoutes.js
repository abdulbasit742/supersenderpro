// routes/experimentsRoutes.js — REST surface for A/B Testing. Mount at /api/experiments.

const express = require('express');
const router = express.Router();

let ex = null; try { ex = require('../lib/experiments'); } catch (e) { ex = null; }
function guard(req, res) { if (!ex) { res.status(503).json({ ok: false, error: 'experiments not available' }); return false; } return true; }

router.get('/status', (req, res) => {
 if (!ex) return res.json({ ok: false, error: 'experiments not loaded' });
 const r = ex.doctor.run(); res.json({ ok: true, posture: r.posture, counts: r.counts });
});
router.get('/doctor', (req, res) => { if (!guard(req, res)) return; res.json(ex.doctor.run()); });
router.get('/overview', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, ...ex.experimentEngine.overview() }); });

router.post('/experiments', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, experiment: ex.experimentEngine.create(req.body || {}) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.get('/experiments', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, items: ex.experimentEngine.list() }); });
router.get('/experiments/:id', (req, res) => { if (!guard(req, res)) return; const e = ex.experimentEngine.get(req.params.id); if (!e) return res.status(404).json({ ok: false, error: 'experiment not found' }); res.json({ ok: true, experiment: e, results: ex.experimentEngine.results(req.params.id) }); });
router.get('/experiments/:id/results', (req, res) => { if (!guard(req, res)) return; const r = ex.experimentEngine.results(req.params.id); if (!r) return res.status(404).json({ ok: false, error: 'experiment not found' }); res.json({ ok: true, ...r }); });

// Assign a contact to a variant (call pre-send). Body: { contact, recordSend? }
router.post('/experiments/:id/assign', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, assignment: ex.experimentEngine.assignFor(req.params.id, (req.body || {}).contact, { recordSend: (req.body || {}).recordSend !== false }) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
// Record a conversion. Body: { contact }
router.post('/experiments/:id/convert', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, ...ex.experimentEngine.recordConversion(req.params.id, (req.body || {}).contact) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });

router.post('/experiments/:id/winner', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, experiment: ex.experimentEngine.declareWinner(req.params.id, (req.body || {}).variantId) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.post('/experiments/:id/stop', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, experiment: ex.experimentEngine.stop(req.params.id) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });

module.exports = router;
