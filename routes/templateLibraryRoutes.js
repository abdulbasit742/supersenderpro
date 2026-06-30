// routes/templateLibraryRoutes.js — REST surface for the Message Templates Library.
// Mount at /api/templates.

const express = require('express');
const router = express.Router();

let tl = null; try { tl = require('../lib/templateLibrary'); } catch (e) { tl = null; }
function guard(req, res) { if (!tl) { res.status(503).json({ ok: false, error: 'template library not available' }); return false; } return true; }

router.get('/status', (req, res) => {
 if (!tl) return res.json({ ok: false, error: 'template library not loaded' });
 const r = tl.doctor.run(); res.json({ ok: true, posture: r.posture, counts: r.counts });
});
router.get('/doctor', (req, res) => { if (!guard(req, res)) return; res.json(tl.doctor.run()); });
router.get('/categories', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, categories: tl.CATEGORIES }); });

router.get('/templates', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, items: tl.templateStore.all({ category: req.query.category, tag: req.query.tag, includeArchived: String(req.query.includeArchived || '') === 'true' }) }); });
router.get('/templates/:id', (req, res) => { if (!guard(req, res)) return; const t = tl.templateStore.get(req.params.id); if (!t) return res.status(404).json({ ok: false, error: 'template not found' }); res.json({ ok: true, template: t }); });
router.post('/templates', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, template: tl.templateStore.upsert(req.body || {}) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.post('/templates/:id/archive', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, template: tl.templateStore.archive(req.params.id) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.get('/templates/:id/history', (req, res) => { if (!guard(req, res)) return; const h = tl.templateStore.history(req.params.id); if (h === null) return res.status(404).json({ ok: false, error: 'template not found' }); res.json({ ok: true, history: h }); });

// Validate a body against an optional context (preview missing vars before saving/sending).
router.post('/validate', (req, res) => { if (!guard(req, res)) return; const b = req.body || {}; if (b.body === undefined) return res.status(400).json({ ok: false, error: 'body is required' }); res.json({ ok: true, ...tl.variables.validate(b.body, { declared: b.declared || [], context: b.context || null }) }); });
// Render a stored template by id against a context. Body: { context }
router.post('/templates/:id/render', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, ...tl.renderTemplate(req.params.id, (req.body || {}).context || {}) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
// Render an ad-hoc body against a context. Body: { body, context }
router.post('/render', (req, res) => { if (!guard(req, res)) return; const b = req.body || {}; if (b.body === undefined) return res.status(400).json({ ok: false, error: 'body is required' }); res.json({ ok: true, text: tl.variables.render(b.body, b.context || {}), ...tl.variables.validate(b.body, { context: b.context || null }) }); });

module.exports = router;
