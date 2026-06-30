'use strict';
/**
 * Self-mountable router for the AI Shipping & COD Calculator (#97).
 * Mount from your suite mounter, NOT server.js:
 *   const shipping = require('./routes/shippingRoutes');
 *   app.use('/ai/shipping', shipping);
 */
const express = require('express');
const router = express.Router();
const calc = require('../lib/shippingCalculator');

function storeIdOf(req) {
  return req.headers['x-store-id'] || (req.body && req.body.storeId) || (req.query && req.query.storeId) || 'default';
}

// POST /quote -> deterministic quote + (optional) LLM-phrased reply
router.post('/quote', async (req, res) => {
  try {
    const storeId = storeIdOf(req);
    const { reply, lang, ...order } = req.body || {};
    if (reply === false) {
      return res.json({ ok: true, quote: calc.quote(order, storeId) });
    }
    const out = await calc.quoteAndReply(order, storeId, { lang });
    res.json({ ok: true, ...out });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err && err.message || err) });
  }
});

// GET /config -> current rate card for a store
router.get('/config', (req, res) => {
  try {
    res.json({ ok: true, config: calc.loadConfig(storeIdOf(req)) });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err && err.message || err) });
  }
});

// PUT /config -> patch a store's rate card (zones, COD, thresholds)
router.put('/config', (req, res) => {
  try {
    const merged = calc.saveConfig(storeIdOf(req), req.body || {});
    res.json({ ok: true, config: merged });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err && err.message || err) });
  }
});

module.exports = router;
