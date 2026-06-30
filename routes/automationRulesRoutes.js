// routes/automationRulesRoutes.js — REST surface for the Automation Rules Engine.
// Mount at /api/automation-rules.

const express = require('express');
const router = express.Router();

let ar = null; try { ar = require('../lib/automationRules'); } catch (e) { ar = null; }
function guard(req, res) { if (!ar) { res.status(503).json({ ok: false, error: 'automation rules not available' }); return false; } return true; }

router.get('/status', (req, res) => {
 if (!ar) return res.json({ ok: false, error: 'automation rules not loaded' });
 const r = ar.doctor.run(); res.json({ ok: true, posture: r.posture, counts: r.counts });
});
router.get('/doctor', (req, res) => { if (!guard(req, res)) return; res.json(ar.doctor.run()); });
router.get('/overview', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, ...ar.engine.overview() }); });
router.get('/catalog', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, events: ar.KNOWN_EVENTS, actionTypes: ar.ACTION_TYPES }); });

// Rules
router.post('/rules', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, rule: ar.ruleStore.upsert(req.body || {}) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.get('/rules', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, items: ar.ruleStore.all() }); });
router.get('/rules/:id', (req, res) => { if (!guard(req, res)) return; const r = ar.ruleStore.get(req.params.id); if (!r) return res.status(404).json({ ok: false, error: 'rule not found' }); res.json({ ok: true, rule: r, runs: ar.engine.runs(20, req.params.id) }); });
router.post('/rules/:id/active', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, rule: ar.ruleStore.setActive(req.params.id, (req.body || {}).active) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.delete('/rules/:id', (req, res) => { if (!guard(req, res)) return; ar.ruleStore.remove(req.params.id); res.json({ ok: true }); });

// Fire an event through the engine (other departments call this, or use it to test a rule).
router.post('/emit', async (req, res) => { if (!guard(req, res)) return; const b = req.body || {}; if (!b.event) return res.status(400).json({ ok: false, error: 'event is required' }); res.json({ ok: true, ...(await ar.engine.emit(b.event, b.payload || {})) }); });

router.get('/runs', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, items: ar.engine.runs(Number(req.query.limit) || 100, req.query.ruleId || null) }); });

module.exports = router;
