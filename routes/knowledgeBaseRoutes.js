// routes/knowledgeBaseRoutes.js
// Self-mountable Express router for the RAG knowledge base.
// Mount in server.js with a single line:
//     app.use('/api/knowledge-base', require('./routes/knowledgeBaseRoutes'));

const express = require('express');
const router = express.Router();
const rag = require('../ai/knowledgeBase/ragStore');

// POST /api/knowledge-base/ingest  Body: { storeId?, title?, text, source? }
router.post('/ingest', async (req, res) => {
  try {
    const { storeId = 'default_store', title = '', text, source = 'manual', meta = {} } = req.body || {};
    if (!text) return res.status(400).json({ success: false, error: 'text is required' });
    const result = await rag.ingestText(storeId, { title, text, source, meta });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/knowledge-base/ingest/faqs  Body: { storeId?, faqs: [{q,a}] }
router.post('/ingest/faqs', async (req, res) => {
  try {
    const { storeId = 'default_store', faqs = [] } = req.body || {};
    if (!Array.isArray(faqs) || !faqs.length) return res.status(400).json({ success: false, error: 'faqs array is required' });
    res.json({ success: true, ...(await rag.ingestFaqs(storeId, faqs)) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/knowledge-base/ingest/products  Body: { storeId?, products: [...] }
router.post('/ingest/products', async (req, res) => {
  try {
    const { storeId = 'default_store', products = [] } = req.body || {};
    if (!Array.isArray(products) || !products.length) return res.status(400).json({ success: false, error: 'products array is required' });
    res.json({ success: true, ...(await rag.ingestProducts(storeId, products)) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/knowledge-base/search?q=...&storeId=...&k=4
router.get('/search', async (req, res) => {
  try {
    const storeId = req.query.storeId || 'default_store';
    const q = req.query.q || req.query.query;
    const k = parseInt(req.query.k || '4', 10);
    if (!q) return res.status(400).json({ success: false, error: 'q is required' });
    res.json({ success: true, results: await rag.search(storeId, q, { k }) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/knowledge-base/stats?storeId=...
router.get('/stats', (req, res) => {
  try {
    const storeId = req.query.storeId || 'default_store';
    res.json({ success: true, ...rag.stats(storeId) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/knowledge-base?storeId=...           (clear all)
// DELETE /api/knowledge-base?storeId=...&source=faq (clear one source)
router.delete('/', (req, res) => {
  try {
    const storeId = req.query.storeId || 'default_store';
    if (req.query.source) return res.json({ success: true, ...rag.removeBySource(storeId, req.query.source) });
    res.json({ success: true, ...rag.clear(storeId) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/knowledge-base/health?storeId=...
router.get('/health', async (req, res) => {
  try {
    const storeId = req.query.storeId || 'default_store';
    res.json({ success: true, ...(await rag.health(storeId)) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
