// routes/templateLibraryRoutes.js — REST surface for the Message Template Library.
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
router.get('/categories', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, categories: tl.templateStore.categories() }); });

router.post('/templates', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, template: tl.templateStore.create(req.body || {}) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.get('/templates', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, items: tl.templateStore.list({ category: req.query.category, status: req.query.status, tag: req.query.tag, q: req.query.q, limit: Number(req.query.limit) || 200 }) }); });
router.get('/templates/:id', (req, res) => { if (!guard(req, res)) return; const t = tl.templateStore.get(req.params.id); if (!t) return res.status(404).json({ ok: false, error: 'template not found' }); res.json({ ok: true, template: t }); });
router.put('/templates/:id', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, template: tl.templateStore.update(req.params.id, req.body || {}) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });

// Approval workflow.
router.post('/templates/:id/submit', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, template: tl.templateStore.submitForReview(req.params.id) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.post('/templates/:id/approve', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, template: tl.templateStore.approve(req.params.id) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.post('/templates/:id/archive', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, template: tl.templateStore.archive(req.params.id) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });

// Preview (no usage, no gate) + render (gated + records usage). Body: { values }
router.post('/templates/:id/preview', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, ...tl.renderer.preview(req.params.id, (req.body || {}).values || {}) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.post('/templates/:id/render', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, ...tl.renderer.render(req.params.id, (req.body || {}).values || {}, { strict: (req.body || {}).strict }) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });

module.exports = router;
