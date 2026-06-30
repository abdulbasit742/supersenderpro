'use strict';
// #58 Shipping & Delivery Tracking — routes. Mount: app.use('/api/shipping', require('./routes/shippingRoutes'))
const express = require('express');
const router = express.Router();
const shipping = require('../lib/shipping');
const { maskShipment } = require('../lib/shipping/privacy');

function tenantOf(req) {
  return (req.headers['x-tenant-id'] || (req.body && req.body.tenantId) || (req.query && req.query.tenantId) || '').toString();
}

function requireTenant(req, res) {
  const t = tenantOf(req);
  if (!t) { res.status(400).json({ ok: false, error: 'tenantId required' }); return null; }
  return t;
}

// Create a shipment
router.post('/', function (req, res) {
  const t = requireTenant(req, res); if (!t) return;
  try {
    const r = shipping.createShipment(t, req.body || {});
    res.json({ ok: true, shipment: maskShipment(r.shipment) });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// List shipments (masked)
router.get('/', function (req, res) {
  const t = requireTenant(req, res); if (!t) return;
  try {
    const items = shipping.list(t, req.query || {}).map(maskShipment);
    res.json({ ok: true, count: items.length, shipments: items });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Track one shipment
router.get('/:id/track', function (req, res) {
  const t = requireTenant(req, res); if (!t) return;
  const r = shipping.track(t, req.params.id);
  if (!r.ok) return res.status(404).json(r);
  res.json(r);
});

// Update status (guarded). Returns draft notification (never auto-sent).
router.post('/:id/status', function (req, res) {
  const t = requireTenant(req, res); if (!t) return;
  const to = (req.body && req.body.status) || '';
  const r = shipping.updateStatus(t, req.params.id, to, req.body && req.body.note);
  if (!r.ok) return res.status(400).json(r);
  res.json({ ok: true, changed: r.changed, shipment: maskShipment(r.shipment), notification: r.notification });
});

module.exports = router;
