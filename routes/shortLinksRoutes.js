// routes/shortLinksRoutes.js — REST surface for Short Links & Click Tracking.
// Admin API mounts at /api/short-links. The PUBLIC redirect handler is exported separately and
// should be mounted at the configured routePrefix (default '/l') so short URLs look clean.

const express = require('express');
const router = express.Router();

let sl = null; try { sl = require('../lib/shortLinks'); } catch (e) { sl = null; }
function guard(req, res) { if (!sl) { res.status(503).json({ ok: false, error: 'short links not available' }); return false; } return true; }

router.get('/status', (req, res) => {
 if (!sl) return res.json({ ok: false, error: 'short links not loaded' });
 const r = sl.doctor.run(); res.json({ ok: true, posture: r.posture, counts: r.counts });
});
router.get('/doctor', (req, res) => { if (!guard(req, res)) return; res.json(sl.doctor.run()); });
router.get('/overview', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, ...sl.analytics.overview() }); });

// Links
router.post('/links', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, link: sl.linkStore.create(req.body || {}) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.get('/links', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, items: sl.linkStore.all() }); });
router.get('/links/:code', (req, res) => { if (!guard(req, res)) return; const l = sl.linkStore.getByCode(req.params.code); if (!l) return res.status(404).json({ ok: false, error: 'link not found' }); res.json({ ok: true, link: sl.linkStore.publicView(l), analytics: sl.analytics.forLink(req.params.code) }); });
router.post('/links/:id/active', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, link: sl.linkStore.setActive(req.params.id, (req.body || {}).active) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });

// Expand link merge tags for a contact (call pre-send). Body: { text, contact, campaign }
router.post('/expand', (req, res) => { if (!guard(req, res)) return; const b = req.body || {}; if (b.text === undefined) return res.status(400).json({ ok: false, error: 'text is required' }); res.json({ ok: true, ...sl.mergeLinks.expand(b.text, { contact: b.contact, campaign: b.campaign }) }); });

router.get('/analytics/by-campaign', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, items: sl.analytics.byCampaign() }); });

// PUBLIC redirect handler — mount at the routePrefix (e.g. app.use('/l', shortLinksRedirect)).
function redirect(req, res) {
 if (!sl) return res.status(503).send('links unavailable');
 const code = req.params.code;
 const r = sl.clickTracker.resolve(code, { contact: req.query.c, campaign: req.query.cmp, ua: req.headers['user-agent'], referrer: req.headers['referer'] || req.headers['referrer'] });
 if (!r.ok) return res.status(r.reason === 'not_found' ? 404 : 410).send('link ' + r.reason);
 res.redirect(302, r.destination);
}

module.exports = router;
module.exports.redirect = redirect;
