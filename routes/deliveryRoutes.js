// routes/deliveryRoutes.js — Commerce #4: delivery tracking.
//
// Wire-up (server.js):
//   const delivery = require('./lib/commerce/delivery');
//   delivery.setNotifier(guardedSend);  // WhatsApp the customer on each status change
//   app.use('/api/delivery', require('./routes/deliveryRoutes'));

const express = require('express');
const router = express.Router();

let delivery;
try { delivery = require('../lib/commerce/delivery'); } catch { delivery = null; }

function ensure(res) {
  if (!delivery) { res.status(503).json({ ok: false, error: 'Delivery not available' }); return false; }
  return true;
}

// Create a shipment. Body: { orderId, contactPhone, courier?, trackingNumber?, status? }
router.post('/', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, shipment: delivery.createShipment(req.body || {}) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Update status. Body: { status }
router.post('/:id/status', (req, res) => {
  if (!ensure(res)) return;
  try {
    const s = delivery.updateStatus(req.params.id, (req.body || {}).status);
    if (!s) return res.status(404).json({ ok: false, error: 'Shipment not found' });
    res.json({ ok: true, shipment: s });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// List shipments. Query: ?status=&contactPhone=
router.get('/', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, shipments: delivery.listShipments(req.query) });
});

// Public tracking lookup (customer-facing). /api/delivery/track/:trackingNumber
router.get('/track/:trackingNumber', (req, res) => {
  if (!ensure(res)) return;
  const t = delivery.track(req.params.trackingNumber);
  if (!t) return res.status(404).json({ ok: false, error: 'Not found' });
  res.json({ ok: true, tracking: t });
});

module.exports = router;
