// routes/deliveryRoutes.js
// Self-mountable Express router for AI delivery tracking + notifications.
// Mount in server.js with a single line:
//     app.use('/api/delivery', require('./routes/deliveryRoutes'));

const express = require('express');
const router = express.Router();
const del = require('../lib/delivery/deliveryTracker');

// POST /api/delivery/create   Body: { storeId?, orderId, phone, items?, courier?, trackingId?, etaISO? }
router.post('/create', (req, res) => {
  try {
    const { storeId = 'default_store', orderId, phone, items, courier, trackingId, etaISO } = req.body || {};
    if (!orderId || !phone) return res.status(400).json({ success: false, error: 'orderId and phone are required' });
    const r = del.createShipment({ storeId, orderId, phone, items, courier, trackingId, etaISO });
    res.status(r.ok ? 200 : 400).json({ success: r.ok, ...r });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

// POST /api/delivery/update   Body: { storeId?, orderId, status, note?, etaISO? }
router.post('/update', async (req, res) => {
  try {
    const { storeId = 'default_store', orderId, status, note, etaISO } = req.body || {};
    if (!orderId || !status) return res.status(400).json({ success: false, error: 'orderId and status are required' });
    const r = await del.updateStatus({ storeId, orderId, status, note, etaISO });
    res.status(r.ok ? 200 : 400).json({ success: r.ok, ...r });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

// GET /api/delivery/shipment/:orderId?storeId=
router.get('/shipment/:orderId', (req, res) => {
  const r = del.getShipment({ storeId: req.query.storeId || 'default_store', orderId: req.params.orderId });
  if (!r) return res.status(404).json({ success: false, error: 'not found' });
  res.json({ success: true, shipment: r });
});

// GET /api/delivery/track/:orderId?storeId=   (customer-facing answer)
router.get('/track/:orderId', async (req, res) => {
  try { res.json({ success: true, ...(await del.trackForCustomer({ storeId: req.query.storeId || 'default_store', orderId: req.params.orderId })) }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/delivery/stuck?storeId=
router.get('/stuck', (req, res) => {
  try { res.json({ success: true, stuck: del.stuckShipments({ storeId: req.query.storeId || 'default_store' }) }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/delivery/notifications?storeId=   (pending customer notifications)
router.get('/notifications', (req, res) => {
  try { res.json({ success: true, due: del.dueNotifications({ storeId: req.query.storeId || 'default_store' }) }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/delivery/notified   Body: { storeId?, orderId }
router.post('/notified', (req, res) => {
  try {
    const { storeId = 'default_store', orderId } = req.body || {};
    if (!orderId) return res.status(400).json({ success: false, error: 'orderId is required' });
    res.json({ success: true, ...del.markNotified({ storeId, orderId }) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/delivery/list?storeId=&status=
router.get('/list', (req, res) => {
  try { const { storeId = 'default_store', status } = req.query; res.json({ success: true, shipments: del.listShipments({ storeId, status }) }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET/PUT /api/delivery/config
router.get('/config', (req, res) => {
  try { res.json({ success: true, config: del.getConfig(req.query.storeId || 'default_store') }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
router.put('/config', (req, res) => {
  try { const { storeId = 'default_store', ...updates } = req.body || {}; res.json({ success: true, config: del.setConfig(storeId, updates) }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/delivery/health
router.get('/health', (req, res) => {
  try { res.json({ success: true, ...del.health() }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
