// routes/cartRecoveryRoutes.js
// Self-mountable Express router for AI abandoned-cart recovery.
// Mount in server.js with a single line:
//     app.use('/api/cart-recovery', require('./routes/cartRecoveryRoutes'));

const express = require('express');
const router = express.Router();
const cart = require('../lib/cartRecovery/cartRecovery');

// POST /api/cart-recovery/scan   Body: { storeId?, stallHours? }
router.post('/scan', async (req, res) => {
  try {
    const { storeId = 'default_store', stallHours } = req.body || {};
    res.json({ success: true, ...(await cart.scan({ storeId, stallHours })) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/cart-recovery/draft   Body: { order, step?, incentive? }
router.post('/draft', async (req, res) => {
  try {
    const { order, step = 0, incentive = '' } = req.body || {};
    if (!order) return res.status(400).json({ success: false, error: 'order is required' });
    res.json({ success: true, ...(await cart.draftMessage({ order, step, incentive })) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/cart-recovery/cadence   Body: { storeId?, phone, order, total?, finalIncentive? }
router.post('/cadence', async (req, res) => {
  try {
    const { storeId = 'default_store', phone, order, total, finalIncentive } = req.body || {};
    if (!phone || !order) return res.status(400).json({ success: false, error: 'phone and order are required' });
    res.json({ success: true, cadence: await cart.buildCadence({ storeId, phone, order, total, finalIncentive }) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/cart-recovery/active?storeId=
router.get('/active', (req, res) => {
  try { res.json({ success: true, active: cart.listActive({ storeId: req.query.storeId || 'default_store' }) }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/cart-recovery/recovered   Body: { storeId?, phone }
router.post('/recovered', (req, res) => {
  try {
    const { storeId = 'default_store', phone } = req.body || {};
    if (!phone) return res.status(400).json({ success: false, error: 'phone is required' });
    res.json({ success: true, ...cart.markRecovered({ storeId, phone }) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/cart-recovery/step-sent   Body: { storeId?, phone, step }
router.post('/step-sent', (req, res) => {
  try {
    const { storeId = 'default_store', phone, step } = req.body || {};
    if (!phone || step === undefined) return res.status(400).json({ success: false, error: 'phone and step are required' });
    res.json({ success: true, ...cart.markStepSent({ storeId, phone, step }) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/cart-recovery/health
router.get('/health', (req, res) => {
  try { res.json({ success: true, ...cart.health() }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
