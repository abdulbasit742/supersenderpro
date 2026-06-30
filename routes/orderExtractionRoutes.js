// routes/orderExtractionRoutes.js
// Self-mountable Express router for AI order extraction.
// Mount in server.js with a single line:
//     app.use('/api/order-extraction', require('./routes/orderExtractionRoutes'));

const express = require('express');
const router = express.Router();
const orders = require('../lib/orderExtraction/orderExtractor');

// POST /api/order-extraction/extract   Body: { storeId?, phone?, text }
router.post('/extract', async (req, res) => {
  try {
    const { storeId = 'default_store', phone, text } = req.body || {};
    if (!text) return res.status(400).json({ success: false, error: 'text is required' });
    res.json({ success: true, ...(await orders.extractOrder({ storeId, phone, text })) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/order-extraction/confirm   Body: { storeId?, phone }
router.post('/confirm', (req, res) => {
  try {
    const { storeId = 'default_store', phone } = req.body || {};
    if (!phone) return res.status(400).json({ success: false, error: 'phone is required' });
    res.json({ success: true, ...orders.confirmOrder({ storeId, phone }) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/order-extraction/draft/:phone?storeId=
router.get('/draft/:phone', (req, res) => {
  const draft = orders.getDraft({ storeId: req.query.storeId || 'default_store', phone: req.params.phone });
  if (!draft) return res.status(404).json({ success: false, error: 'no draft for this contact' });
  res.json({ success: true, draft });
});

// GET /api/order-extraction/drafts?storeId=&status=&limit=
router.get('/drafts', (req, res) => {
  try {
    const { storeId = 'default_store', status, limit } = req.query;
    res.json({ success: true, drafts: orders.listDrafts({ storeId, status, limit: limit ? parseInt(limit, 10) : 50 }) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/order-extraction/health
router.get('/health', (req, res) => {
  try { res.json({ success: true, ...orders.health() }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
