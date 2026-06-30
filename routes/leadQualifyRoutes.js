// routes/leadQualifyRoutes.js
// Self-mountable Express router for AI conversational lead qualification.
// Mount in server.js with a single line:
//     app.use('/api/lead-qualify', require('./routes/leadQualifyRoutes'));

const express = require('express');
const router = express.Router();
const q = require('../lib/leadQualify/leadQualify');

// POST /api/lead-qualify/start   Body: { storeId?, phone }
router.post('/start', async (req, res) => {
  try {
    const { storeId = 'default_store', phone } = req.body || {};
    if (!phone) return res.status(400).json({ success: false, error: 'phone is required' });
    res.json({ success: true, ...(await q.start({ storeId, phone })) });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

// POST /api/lead-qualify/answer   Body: { storeId?, phone, text }
router.post('/answer', async (req, res) => {
  try {
    const { storeId = 'default_store', phone, text } = req.body || {};
    if (!phone) return res.status(400).json({ success: false, error: 'phone is required' });
    const r = await q.answer({ storeId, phone, text });
    res.status(r.ok ? 200 : 400).json({ success: r.ok, ...r });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

// GET /api/lead-qualify/session?storeId=&phone=
router.get('/session', (req, res) => {
  try {
    const { storeId = 'default_store', phone } = req.query;
    if (!phone) return res.status(400).json({ success: false, error: 'phone is required' });
    res.json({ success: true, session: q.getSession({ storeId, phone }) });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

// GET /api/lead-qualify/list?storeId=&band=&status=
router.get('/list', (req, res) => {
  try {
    const { storeId = 'default_store', band, status } = req.query;
    res.json({ success: true, sessions: q.listSessions({ storeId, band, status }) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET/PUT /api/lead-qualify/config
router.get('/config', (req, res) => {
  try { res.json({ success: true, config: q.getConfig(req.query.storeId || 'default_store') }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
router.put('/config', (req, res) => {
  try { const { storeId = 'default_store', ...updates } = req.body || {}; res.json({ success: true, config: q.setConfig(storeId, updates) }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/lead-qualify/health
router.get('/health', (req, res) => {
  try { res.json({ success: true, ...q.health() }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
