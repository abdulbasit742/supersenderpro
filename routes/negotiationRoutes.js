// routes/negotiationRoutes.js
// Self-mountable Express router for the AI price negotiation assistant.
// Mount in server.js with a single line:
//     app.use('/api/negotiation', require('./routes/negotiationRoutes'));

const express = require('express');
const router = express.Router();
const neg = require('../lib/negotiation/negotiator');

// GET /api/negotiation/policy?storeId=
router.get('/policy', (req, res) => {
  try { res.json({ success: true, policy: neg.getPolicy(req.query.storeId || 'default_store') }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// PUT /api/negotiation/policy   Body: { storeId?, defaults?, products? }
router.put('/policy', (req, res) => {
  try {
    const { storeId = 'default_store', defaults, products } = req.body || {};
    res.json({ success: true, policy: neg.setPolicy(storeId, { defaults, products }) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/negotiation/offer   Body: { storeId?, phone, product, customerOffer, listPrice? }
router.post('/offer', async (req, res) => {
  try {
    const { storeId = 'default_store', phone, product, customerOffer, listPrice } = req.body || {};
    if (!phone || !product) return res.status(400).json({ success: false, error: 'phone and product are required' });
    if (customerOffer === undefined || customerOffer === null || isNaN(Number(customerOffer))) return res.status(400).json({ success: false, error: 'customerOffer (number) is required' });
    res.json({ success: true, ...(await neg.handleOffer({ storeId, phone, product, customerOffer, listPrice })) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/negotiation/state?storeId=&phone=&product=
router.get('/state', (req, res) => {
  try {
    const { storeId = 'default_store', phone, product } = req.query;
    if (!phone || !product) return res.status(400).json({ success: false, error: 'phone and product are required' });
    res.json({ success: true, state: neg.getState({ storeId, phone, product }) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/negotiation/reset   Body: { storeId?, phone, product }
router.post('/reset', (req, res) => {
  try {
    const { storeId = 'default_store', phone, product } = req.body || {};
    if (!phone || !product) return res.status(400).json({ success: false, error: 'phone and product are required' });
    res.json({ success: true, ...neg.resetState({ storeId, phone, product }) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/negotiation/health
router.get('/health', (req, res) => {
  try { res.json({ success: true, ...neg.health() }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
