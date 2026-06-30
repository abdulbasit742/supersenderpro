// routes/customer360Routes.js — REST surface for Customer 360 & Activity Timeline.
// Mount at /api/customer-360.

const express = require('express');
const router = express.Router();

let c3 = null; try { c3 = require('../lib/customer360'); } catch (e) { c3 = null; }
function guard(req, res) { if (!c3) { res.status(503).json({ ok: false, error: 'customer 360 not available' }); return false; } return true; }

router.get('/status', (req, res) => {
 if (!c3) return res.json({ ok: false, error: 'customer 360 not loaded' });
 const r = c3.doctor.run(); res.json({ ok: true, posture: r.posture, counts: r.counts });
});
router.get('/doctor', (req, res) => { if (!guard(req, res)) return; res.json(c3.doctor.run()); });

// Record an activity event (other departments call this where things happen). Body: { contact, type, meta }
router.post('/track', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, event: c3.timeline.track(req.body || {}) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });

// Full 360 profile for a contact. ?contact=...
router.get('/profile', (req, res) => { if (!guard(req, res)) return; const c = req.query.contact; if (!c) return res.status(400).json({ ok: false, error: 'contact is required' }); res.json({ ok: true, profile: c3.profile.build(c) }); });
// A contact's timeline. ?contact=...&type=&limit=
router.get('/timeline', (req, res) => { if (!guard(req, res)) return; const c = req.query.contact; if (!c) return res.status(400).json({ ok: false, error: 'contact is required' }); res.json({ ok: true, contactMasked: c3.timeline.maskedContact(c), events: c3.timeline.events(c, { type: req.query.type, limit: Number(req.query.limit) || 100 }) }); });
// Just the engagement score. ?contact=...
router.get('/engagement', (req, res) => { if (!guard(req, res)) return; const c = req.query.contact; if (!c) return res.status(400).json({ ok: false, error: 'contact is required' }); res.json({ ok: true, ...c3.engagement.score(c3.timeline.rawEvents(c)) }); });

module.exports = router;
