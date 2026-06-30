// routes/sendTimeRoutes.js
// Self-mountable Express router for the Smart Send-Time Optimizer.
// Mount in server.js with a single line:
//     app.use('/api/send-time', require('./routes/sendTimeRoutes'));

const express = require('express');
const router = express.Router();
const st = require('../lib/sendTime/sendTimeOptimizer');

// POST /api/send-time/engagement   Body: { storeId?, phone, ts?, weight? }
router.post('/engagement', (req, res) => {
  try {
    const { storeId = 'default_store', phone, ts, weight } = req.body || {};
    if (!phone) return res.status(400).json({ success: false, error: 'phone is required' });
    const rec = st.logEngagement({ storeId, phone, ts: ts || Date.now(), weight: weight || 1 });
    res.json({ success: true, count: rec.count });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/send-time/best?storeId=&phone=
router.get('/best', async (req, res) => {
  try {
    const { storeId = 'default_store', phone } = req.query;
    if (!phone) return res.status(400).json({ success: false, error: 'phone is required' });
    res.json({ success: true, ...(await st.bestTime({ storeId, phone })) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/send-time/schedule   Body: { storeId?, phones:[], maxPerSlot? }
router.post('/schedule', (req, res) => {
  try {
    const { storeId = 'default_store', phones = [], maxPerSlot } = req.body || {};
    if (!phones.length) return res.status(400).json({ success: false, error: 'phones array is required' });
    res.json({ success: true, ...st.scheduleBroadcast({ storeId, phones, maxPerSlot: maxPerSlot || 20 }) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/send-time/health
router.get('/health', (req, res) => {
  try { res.json({ success: true, ...st.health() }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
