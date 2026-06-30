// routes/knowledgeBaseRoutes.js — REST surface for the Knowledge Base. Mount at /api/kb.
// The search + published-article GETs are safe to expose to a public help widget; authoring
// endpoints should sit behind your existing admin/session auth.

const express = require('express');
const router = express.Router();

let kb = null; try { kb = require('../lib/knowledgeBase'); } catch (e) { kb = null; }
function guard(req, res) { if (!kb) { res.status(503).json({ ok: false, error: 'knowledge base not available' }); return false; } return true; }

router.get('/status', (req, res) => {
 if (!kb) return res.json({ ok: false, error: 'knowledge base not loaded' });
 const r = kb.doctor.run(); res.json({ ok: true, posture: r.posture, counts: r.counts });
});
router.get('/doctor', (req, res) => { if (!guard(req, res)) return; res.json(kb.doctor.run()); });
router.get('/categories', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, categories: kb.articleStore.categories() }); });

// Ranked search (published-only by default). ?q=...&limit=
router.get('/search', (req, res) => { if (!guard(req, res)) return; const q = req.query.q || ''; res.json({ ok: true, query: q, results: kb.search(q, { limit: Number(req.query.limit) || undefined }) }); });

// Articles
router.post('/articles', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, article: kb.articleStore.create(req.body || {}) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.get('/articles', (req, res) => { if (!guard(req, res)) return; res.json({ ok: true, items: kb.articleStore.list({ status: req.query.status, category: req.query.category, tag: req.query.tag, limit: Number(req.query.limit) || 200 }) }); });
router.get('/articles/:id', (req, res) => { if (!guard(req, res)) return; const a = kb.articleStore.get(req.params.id, { countView: String(req.query.countView || '') === 'true' }); if (!a) return res.status(404).json({ ok: false, error: 'article not found' }); res.json({ ok: true, article: a }); });
router.put('/articles/:id', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, article: kb.articleStore.update(req.params.id, req.body || {}) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.post('/articles/:id/publish', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, article: kb.articleStore.publish(req.params.id) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });
router.post('/articles/:id/archive', (req, res) => { if (!guard(req, res)) return; try { res.json({ ok: true, article: kb.articleStore.archive(req.params.id) }); } catch (e) { res.status(400).json({ ok: false, error: e.message }); } });

module.exports = router;
