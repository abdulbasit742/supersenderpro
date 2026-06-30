// routes/knowledgeBaseRoutes.js — Support #2: knowledge base.
//
// Wire-up (server.js) — connect KB search into the AI support agent (#1):
//   const kb = require('./lib/support/knowledgeBase');
//   require('./lib/support/aiSupportAgent').setKbLookup((q) => kb.search(q, 5));
//   app.use('/api/support/kb', require('./routes/knowledgeBaseRoutes'));
//
// Now the AI agent grounds its answers in your FAQs instead of guessing.

const express = require('express');
const router = express.Router();

let kb;
try { kb = require('../lib/support/knowledgeBase'); } catch { kb = null; }

function ensure(res) {
  if (!kb) { res.status(503).json({ ok: false, error: 'Knowledge base not available' }); return false; }
  return true;
}

router.get('/', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, articles: kb.listArticles() });
});

// Search. Query: ?q=...&limit=
router.get('/search', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, results: kb.search(req.query.q || '', Number(req.query.limit) || 5) });
});

// Add. Body: { question, answer, tags? }
router.post('/', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, article: kb.addArticle(req.body || {}) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Bulk import. Body: { items: [{question,answer,tags?}] }
router.post('/bulk', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, ...kb.bulkImport((req.body || {}).items || []) });
});

router.put('/:id', (req, res) => {
  if (!ensure(res)) return;
  const a = kb.updateArticle(req.params.id, req.body || {});
  if (!a) return res.status(404).json({ ok: false, error: 'Article not found' });
  res.json({ ok: true, article: a });
});

router.delete('/:id', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, ...kb.deleteArticle(req.params.id) });
});

module.exports = router;
