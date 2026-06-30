// routes/consentRoutes.js
// Self-mountable Express router for the consent & compliance manager.
// Mount in server.js with a single line:
//     app.use('/api/consent', require('./routes/consentRoutes'));

const express = require('express');
const router = express.Router();
const consent = require('../lib/consent/consentManager');

// POST /api/consent/opt-in   Body: { storeId?, phone, source? }
router.post('/opt-in', (req, res) => {
  try { const { storeId = 'default_store', phone, source } = req.body || {}; if (!phone) return res.status(400).json({ success: false, error: 'phone is required' }); res.json({ success: true, ...consent.optIn({ storeId, phone, source }) }); }
  catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

// POST /api/consent/opt-out   Body: { storeId?, phone, source? }
router.post('/opt-out', (req, res) => {
  try { const { storeId = 'default_store', phone, source } = req.body || {}; if (!phone) return res.status(400).json({ success: false, error: 'phone is required' }); res.json({ success: true, ...consent.optOut({ storeId, phone, source }) }); }
  catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

// POST /api/consent/inbound   Body: { storeId?, phone, text }   (detect STOP/START in a message)
router.post('/inbound', async (req, res) => {
  try { const { storeId = 'default_store', phone, text } = req.body || {}; if (!phone) return res.status(400).json({ success: false, error: 'phone is required' }); res.json({ success: true, ...(await consent.processInbound({ storeId, phone, text })) }); }
  catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

// GET /api/consent/can-send?storeId=&phone=&ignoreQuietHours=
router.get('/can-send', (req, res) => {
  try { const { storeId = 'default_store', phone, ignoreQuietHours } = req.query; if (!phone) return res.status(400).json({ success: false, error: 'phone is required' }); res.json({ success: true, ...consent.canSendMarketing({ storeId, phone, ignoreQuietHours: ignoreQuietHours === 'true' }) }); }
  catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

// POST /api/consent/filter   Body: { storeId?, phones:[], ignoreQuietHours? }
router.post('/filter', (req, res) => {
  try { const { storeId = 'default_store', phones = [], ignoreQuietHours } = req.body || {}; res.json({ success: true, ...consent.filterSendable({ storeId, phones, ignoreQuietHours: ignoreQuietHours === true }) }); }
  catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

// GET /api/consent/status?storeId=&phone=
router.get('/status', (req, res) => {
  try { const { storeId = 'default_store', phone } = req.query; if (!phone) return res.status(400).json({ success: false, error: 'phone is required' }); res.json({ success: true, ...consent.status({ storeId, phone }) }); }
  catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

// GET /api/consent/audit?storeId=&phone=   (compliance proof)
router.get('/audit', (req, res) => {
  try { const { storeId = 'default_store', phone } = req.query; if (!phone) return res.status(400).json({ success: false, error: 'phone is required' }); res.json({ success: true, ...consent.exportAudit({ storeId, phone }) }); }
  catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

// GET /api/consent/stats?storeId=
router.get('/stats', (req, res) => {
  try { res.json({ success: true, ...consent.stats({ storeId: req.query.storeId || 'default_store' }) }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET/PUT /api/consent/config
router.get('/config', (req, res) => {
  try { res.json({ success: true, config: consent.getConfig(req.query.storeId || 'default_store') }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
router.put('/config', (req, res) => {
  try { const { storeId = 'default_store', ...updates } = req.body || {}; res.json({ success: true, config: consent.setConfig(storeId, updates) }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/consent/health
router.get('/health', (req, res) => {
  try { res.json({ success: true, ...consent.health() }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
