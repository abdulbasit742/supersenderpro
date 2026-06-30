// routes/leadIntelRoutes.js
// Self-mountable Express router for AI Lead Intelligence.
// Mount in server.js with a single line:
//     app.use('/api/lead-intel', require('./routes/leadIntelRoutes'));

const express = require('express');
const router = express.Router();
const leadIntel = require('../lib/leadIntel/leadIntel');

// POST /api/lead-intel/score   Body: { storeId?, phone, signals?, enrichAI? }
router.post('/score', async (req, res) => {
  try {
    const { storeId = 'default_store', phone, signals = {}, enrichAI } = req.body || {};
    if (!phone) return res.status(400).json({ success: false, error: 'phone is required' });
    const record = await leadIntel.scoreLead({ storeId, phone, signals, enrichAI: enrichAI !== false });
    res.json({ success: true, lead: record });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/lead-intel/batch   Body: { storeId?, leads?, enrichAI? }
router.post('/batch', async (req, res) => {
  try {
    const { storeId = 'default_store', leads, enrichAI } = req.body || {};
    const result = await leadIntel.batchScore({ storeId, leads, enrichAI: enrichAI !== false });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/lead-intel/top?storeId=&limit=&band=
router.get('/top', (req, res) => {
  try {
    const { storeId = 'default_store', limit, band } = req.query;
    res.json({ success: true, leads: leadIntel.topLeads({ storeId, limit: limit ? parseInt(limit, 10) : 20, band }) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/lead-intel/lead/:phone?storeId=
router.get('/lead/:phone', (req, res) => {
  const lead = leadIntel.getLead({ storeId: req.query.storeId || 'default_store', phone: req.params.phone });
  if (!lead) return res.status(404).json({ success: false, error: 'lead not scored yet' });
  res.json({ success: true, lead });
});

// GET /api/lead-intel/health
router.get('/health', (req, res) => {
  try { res.json({ success: true, ...leadIntel.health() }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
