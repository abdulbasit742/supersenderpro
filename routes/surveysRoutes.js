// routes/surveysRoutes.js — REST surface for Surveys & NPS/CSAT Feedback. Mount at /api/surveys.

const express = require('express');
const router = express.Router();

let sv = null; try { sv = require('../lib/surveys'); } catch (e) { sv = null; }
function guard(req, res) { if (!sv) { res.status(503).json({ ok: false, error: 'surveys not available' }); return false; } return true; }

router.get('/status', (req, res) => {
 if (!sv) return res.json({ ok: false, error: 'surveys not loaded' });
 const r = sv.doctor.run(); res.json({ ok: true, posture: r.posture, counts: r.counts });
});
router.get('/doctor', (req, res) => { if (!guard(req, res)) return; res.json(sv.doctor.run()); });
router.get('/overview', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, ...sv.surveyEngine.overview() }); });

router.post('/surveys', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, survey: sv.surveyEngine.create(req.body || {}) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.get('/surveys', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, items: sv.surveyEngine.list() }); });
router.get('/surveys/:id', (req, res) => { if (!guard(req, res)) return; const s = sv.surveyEngine.get(req.params.id); if (!s) return res.status(404).json({ ok: false, error: 'survey not found' }); res.json({ ok: true, survey: s, results: sv.surveyEngine.results(req.params.id) }); });
router.get('/surveys/:id/results', (req, res) => { if (!guard(req, res)) return; const r = sv.surveyEngine.results(req.params.id); if (!r) return res.status(404).json({ ok: false, error: 'survey not found' }); res.json({ ok: true, ...r }); });
router.get('/surveys/:id/responses', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, items: sv.surveyEngine.responses(req.params.id, Number(req.query.limit) || 100) }); });

// Send a survey to a contact (draft-only unless live). Body: { contact }
router.post('/surveys/:id/send', async (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, ...(await sv.surveyEngine.send(req.params.id, (req.body || {}).contact)) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });

// Capture an inbound reply (call from the WhatsApp inbound handler). Body: { contact, text }
router.post('/capture', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, ...sv.surveyEngine.capture(req.body || {}) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });

router.setNotifier = (fn) => (sv ? sv.notify.setNotifier(fn) : false);

module.exports = router;
