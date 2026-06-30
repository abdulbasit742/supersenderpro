'use strict';
// Express router for Cart Recovery. Mount in server.js:
//   const cartRecoveryRoutes = require('./routes/cartRecoveryRoutes');
//   app.use('/api/cart-recovery', cartRecoveryRoutes);
const express = require('express');
const router = express.Router();
const cart = require('../lib/cartRecovery');

// tenant resolver: header > body > query. Keep consistent with the rest of the app.
function tenantOf(req) {
  return req.headers['x-tenant-id'] || (req.body && req.body.tenantId) || req.query.tenantId;
}

router.get('/health', (req, res) => res.json(cart.check()));

router.get('/carts', (req, res) => {
  try { res.json({ ok: true, carts: cart.listCarts({ tenantId: tenantOf(req), status: req.query.status }) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

router.post('/carts', (req, res) => {
  try {
    const c = cart.upsertCart({
      tenantId: tenantOf(req),
      cartId: req.body.cartId,
      contact: req.body.contact,
      items: req.body.items,
      total: req.body.total,
      status: req.body.status,
    });
    res.json({ ok: true, cart: c });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

router.post('/carts/:cartId/converted', (req, res) => {
  try {
    const c = cart.markConverted({ tenantId: tenantOf(req), cartId: req.params.cartId, orderId: req.body.orderId });
    if (!c) return res.status(404).json({ ok: false, error: 'cart not found' });
    res.json({ ok: true, cart: c });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

router.post('/tick', (req, res) => {
  try { res.json({ ok: true, summary: cart.tick({ tenantId: tenantOf(req) }) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

router.get('/nudges', (req, res) => {
  try { res.json({ ok: true, nudges: cart.listNudges({ tenantId: tenantOf(req), status: req.query.status }) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

router.get('/stats', (req, res) => {
  try { res.json({ ok: true, stats: cart.stats({ tenantId: tenantOf(req) }) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

module.exports = router;
