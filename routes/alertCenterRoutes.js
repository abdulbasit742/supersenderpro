// routes/alertCenterRoutes.js — REST surface for Notifications & Alerts. Mount at /api/alerts.

const express = require('express');
const router = express.Router();

let ac = null; try { ac = require('../lib/alertCenter'); } catch (e) { ac = null; }
function guard(req, res) { if (!ac) { res.status(503).json({ ok: false, error: 'alert center not available' }); return false; } return true; }

router.get('/status', (req, res) => {
 if (!ac) return res.json({ ok: false, error: 'alert center not loaded' });
 const r = ac.doctor.run(); res.json({ ok: true, posture: r.posture, counts: r.counts });
});
router.get('/doctor', (req, res) => { if (!guard(req, res)) return; res.json(ac.doctor.run()); });
router.get('/overview', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, ...ac.alertEngine.overview() }); });
router.get('/digest', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, ...ac.alertEngine.digest() }); });

// Emit an event (other departments call this, or use it to test a rule).
router.post('/emit', async (req, res) => { if (!guard(req, res)) return; const b = req.body || {}; if (!b.event) return res.status(400).json({ ok: false, error: 'event is required' }); res.json({ ok: true, ...(await ac.alertEngine.emit(b.event, b.payload || {})) }); });

// Feed
router.get('/feed', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, items: ac.alertEngine.feed({ severity: req.query.severity, event: req.query.event, unreadOnly: String(req.query.unreadOnly || '') === 'true', limit: Number(req.query.limit) || 100 }) }); });
router.post('/feed/:id/read', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, ...ac.alertEngine.markRead(req.params.id) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.post('/feed/read-all', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, ...ac.alertEngine.markAllRead() }); });

// Rules
router.get('/rules', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, items: ac.ruleStore.all() }); });
router.post('/rules', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, rule: ac.ruleStore.upsert(req.body || {}) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.post('/rules/:id/active', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, rule: ac.ruleStore.setActive(req.params.id, (req.body || {}).active) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.delete('/rules/:id', (req, res) => { if (!guard(req, res)) return; ac.ruleStore.remove(req.params.id); res.json({ ok: true }); });

router.setNotifier = (fn) => (ac ? ac.notify.setNotifier(fn) : false);

module.exports = router;
