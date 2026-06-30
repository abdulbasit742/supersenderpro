// routes/dripCampaignsRoutes.js — REST surface for Drip Campaigns. Mount at /api/drip-campaigns.

const express = require('express');
const router = express.Router();

let dc = null; try { dc = require('../lib/dripCampaigns'); } catch (e) { dc = null; }
function guard(req, res) { if (!dc) { res.status(503).json({ ok: false, error: 'drip campaigns not available' }); return false; } return true; }

router.get('/status', (req, res) => {
 if (!dc) return res.json({ ok: false, error: 'drip campaigns not loaded' });
 const r = dc.doctor.run(); res.json({ ok: true, posture: r.posture, counts: r.counts });
});
router.get('/doctor', (req, res) => { if (!guard(req, res)) return; res.json(dc.doctor.run()); });
router.get('/overview', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, ...dc.enrollmentEngine.overview() }); });

// Journeys
router.get('/journeys', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, items: dc.journeyStore.all() }); });
router.get('/journeys/:id', (req, res) => { if (!guard(req, res)) return; const j = dc.journeyStore.get(req.params.id); if (!j) return res.status(404).json({ ok: false, error: 'journey not found' }); res.json({ ok: true, journey: j }); });
router.post('/journeys', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, journey: dc.journeyStore.upsert(req.body || {}) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.post('/journeys/:id/active', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, journey: dc.journeyStore.setActive(req.params.id, (req.body || {}).active) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });

// Events + enrollment (call /event from signup, abandoned-cart, payment-success, etc.)
router.post('/event', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, ...dc.enrollmentEngine.handleEvent(req.body || {}) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.post('/journeys/:id/enroll', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, ...dc.enrollmentEngine.enrollManual(req.params.id, req.body || {}) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.get('/enrollments', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, items: dc.enrollmentEngine.listEnrollments({ journeyId: req.query.journeyId, status: req.query.status, limit: Number(req.query.limit) || 100 }) }); });
router.post('/enrollments/:id/stop', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, enrollment: dc.enrollmentEngine.stop(req.params.id, (req.body || {}).reason || 'manual') }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });

// Drive the journeys forward (wire to node-cron, or call manually/admin).
router.post('/tick', async (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, ...(await dc.enrollmentEngine.tick()) }); });

router.setNotifier = (fn) => (dc ? dc.notify.setNotifier(fn) : false);

module.exports = router;
