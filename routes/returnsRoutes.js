// routes/returnsRoutes.js
// Self-mountable Express router for the AI returns & refund (RMA) handler.
// Mount in server.js with a single line:
//     app.use('/api/returns', require('./routes/returnsRoutes'));

const express = require('express');
const router = express.Router();
const ret = require('../lib/returns/returnsEngine');

// POST /api/returns/open   Body: { storeId?, orderId?, phone, product?, reason, deliveredAt?, hasPhoto?, value? }
router.post('/open', async (req, res) => {
  try {
    const { storeId = 'default_store', orderId, phone, product, reason, deliveredAt, hasPhoto, value } = req.body || {};
    if (!phone || !reason) return res.status(400).json({ success: false, error: 'phone and reason are required' });
    res.json({ success: true, ...(await ret.openReturn({ storeId, orderId, phone, product, reason, deliveredAt, hasPhoto, value })) });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

// POST /api/returns/decide   Body: { storeId?, rmaId, decision, refundPct? }
router.post('/decide', (req, res) => {
  try {
    const { storeId = 'default_store', rmaId, decision, refundPct } = req.body || {};
    if (!rmaId || !decision) return res.status(400).json({ success: false, error: 'rmaId and decision are required' });
    const r = ret.decide({ storeId, rmaId, decision, refundPct });
    res.status(r.ok ? 200 : 400).json({ success: r.ok, ...r });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

// POST /api/returns/received   Body: { storeId?, rmaId }
router.post('/received', (req, res) => {
  try {
    const { storeId = 'default_store', rmaId } = req.body || {};
    if (!rmaId) return res.status(400).json({ success: false, error: 'rmaId is required' });
    const r = ret.markReceived({ storeId, rmaId });
    res.status(r.ok ? 200 : 400).json({ success: r.ok, ...r });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

// POST /api/returns/refund   Body: { storeId?, rmaId }
router.post('/refund', (req, res) => {
  try {
    const { storeId = 'default_store', rmaId } = req.body || {};
    if (!rmaId) return res.status(400).json({ success: false, error: 'rmaId is required' });
    const r = ret.refund({ storeId, rmaId });
    res.status(r.ok ? 200 : 400).json({ success: r.ok, ...r });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

// GET /api/returns/rma/:rmaId?storeId=
router.get('/rma/:rmaId', (req, res) => {
  const r = ret.getRMA({ storeId: req.query.storeId || 'default_store', rmaId: req.params.rmaId });
  if (!r) return res.status(404).json({ success: false, error: 'not found' });
  res.json({ success: true, rma: r });
});

// GET /api/returns/list?storeId=&status=&phone=
router.get('/list', (req, res) => {
  try { const { storeId = 'default_store', status, phone } = req.query; res.json({ success: true, returns: ret.listRMA({ storeId, status, phone }) }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/returns/stats?storeId=
router.get('/stats', (req, res) => {
  try { res.json({ success: true, ...ret.stats({ storeId: req.query.storeId || 'default_store' }) }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET/PUT /api/returns/policy
router.get('/policy', (req, res) => {
  try { res.json({ success: true, policy: ret.getPolicy(req.query.storeId || 'default_store') }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
router.put('/policy', (req, res) => {
  try { const { storeId = 'default_store', ...updates } = req.body || {}; res.json({ success: true, policy: ret.setPolicy(storeId, updates) }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/returns/health
router.get('/health', (req, res) => {
  try { res.json({ success: true, ...ret.health() }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
