// routes/faqTrainerRoutes.js
// Self-mountable Express router for the self-improving FAQ trainer.
// Mount in server.js with a single line:
//     app.use('/api/faq-trainer', require('./routes/faqTrainerRoutes'));

const express = require('express');
const router = express.Router();
const trainer = require('../lib/faqTrainer/faqTrainer');

// POST /api/faq-trainer/mine   Body: { storeId?, onlyEscalated?, sinceDays?, minClusterSize? }
router.post('/mine', async (req, res) => {
  try {
    const { storeId = 'default_store', onlyEscalated, sinceDays, minClusterSize } = req.body || {};
    res.json({ success: true, ...(await trainer.mine({ storeId, onlyEscalated, sinceDays, minClusterSize })) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/faq-trainer/candidates?storeId=&status=pending
router.get('/candidates', (req, res) => {
  try {
    const { storeId = 'default_store', status, limit } = req.query;
    res.json({ success: true, candidates: trainer.listCandidates({ storeId, status: status || 'pending', limit: limit ? parseInt(limit, 10) : 100 }) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/faq-trainer/approve   Body: { storeId?, id, q?, a? }
router.post('/approve', async (req, res) => {
  try {
    const { storeId = 'default_store', id, q, a } = req.body || {};
    if (!id) return res.status(400).json({ success: false, error: 'id is required' });
    res.json({ success: true, ...(await trainer.approve({ storeId, id, q, a })) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/faq-trainer/reject   Body: { storeId?, id }
router.post('/reject', (req, res) => {
  try {
    const { storeId = 'default_store', id } = req.body || {};
    if (!id) return res.status(400).json({ success: false, error: 'id is required' });
    res.json({ success: true, ...trainer.reject({ storeId, id }) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/faq-trainer/health
router.get('/health', (req, res) => {
  try { res.json({ success: true, ...trainer.health() }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
