// routes/reviewRoutes.js
// Self-mountable Express router for the AI review & feedback collector.
// Mount in server.js with a single line:
//     app.use('/api/reviews', require('./routes/reviewRoutes'));

const express = require('express');
const router = express.Router();
const reviews = require('../lib/reviews/reviewCollector');

// POST /api/reviews/request   Body: { storeId?, phone, orderId?, delayHours? }
router.post('/request', (req, res) => {
  try {
    const { storeId = 'default_store', phone, orderId, delayHours } = req.body || {};
    if (!phone) return res.status(400).json({ success: false, error: 'phone is required' });
    res.json({ success: true, ...reviews.requestReview({ storeId, phone, orderId, delayHours }) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/reviews/reply   Body: { storeId?, phone, text }
router.post('/reply', async (req, res) => {
  try {
    const { storeId = 'default_store', phone, text } = req.body || {};
    if (!phone || !text) return res.status(400).json({ success: false, error: 'phone and text are required' });
    res.json({ success: true, ...(await reviews.ingestReply({ storeId, phone, text })) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/reviews/testimonials?storeId=&minRating=&limit=
router.get('/testimonials', (req, res) => {
  try {
    const { storeId = 'default_store', minRating, limit } = req.query;
    res.json({ success: true, testimonials: reviews.listTestimonials({ storeId, minRating: minRating ? parseInt(minRating, 10) : undefined, limit: limit ? parseInt(limit, 10) : 100 }) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/reviews/stats?storeId=
router.get('/stats', (req, res) => {
  try { res.json({ success: true, ...reviews.stats({ storeId: req.query.storeId || 'default_store' }) }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/reviews/health
router.get('/health', (req, res) => {
  try { res.json({ success: true, ...reviews.health() }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
