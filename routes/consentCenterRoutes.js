// routes/consentCenterRoutes.js — REST surface for Consent & Opt-Out Compliance.
// Mount at /api/consent.

const express = require('express');
const router = express.Router();

let cc = null; try { cc = require('../lib/consentCenter'); } catch (e) { cc = null; }
function guard(req, res) { if (!cc) { res.status(503).json({ ok: false, error: 'consent center not available' }); return false; } return true; }

router.get('/status', (req, res) => {
 if (!cc) return res.json({ ok: false, error: 'consent center not loaded' });
 const r = cc.doctor.run(); res.json({ ok: true, posture: r.posture, counts: r.counts });
});
router.get('/doctor', (req, res) => { if (!guard(req, res)) return; res.json(cc.doctor.run()); });
router.get('/overview', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, ...cc.consentEngine.overview() }); });

// THE GATE — check a single contact before sending. ?contact=...
router.get('/can-send', (req, res) => { if (!guard(req, res)) return; const c = req.query.contact; if (!c) return res.status(400).json({ ok: false, error: 'contact is required' }); res.json({ ok: true, ...cc.consentEngine.canSend(c) }); });
// Filter a batch (broadcast). Body: { contacts:[...] }
router.post('/filter', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, ...cc.consentEngine.filterSendable((req.body || {}).contacts || []) }); });

// Process an inbound message (call from the WhatsApp inbound handler BEFORE other handling).
router.post('/inbound', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, ...cc.consentEngine.processInbound(req.body || {}) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });

// Manual consent set (e.g. from a web form or admin). Body: { contact, status, source? }
router.post('/set', (req, res) => { if (!guard(req, res)) return; const b = req.body || {}; if (!b.contact || !b.status) return res.status(400).json({ ok: false, error: 'contact and status required' }); try { res.json({ ok: true, ...cc.consentEngine.setStatus(b.contact, b.status, b.source || 'manual') }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.get('/lookup', (req, res) => { if (!guard(req, res)) return; const c = req.query.contact; if (!c) return res.status(400).json({ ok: false, error: 'contact is required' }); res.json({ ok: true, status: cc.consentEngine.getStatus(c) }); });

router.get('/suppression-list', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, items: cc.consentEngine.suppressionList(Number(req.query.limit) || 1000) }); });
router.get('/log', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, items: cc.consentEngine.log(Number(req.query.limit) || 200) }); });

module.exports = router;
