// routes/abandonedCartRoutes.js — Ecommerce #1: abandoned cart recovery.
//
// Wire-up (server.js):
//   const cart = require('./lib/ecommerce/abandonedCart');
//   cart.setSender(guardedSend);                 // send guard #1
//   cart.setEventRecorder((p,ev) => require('./lib/crm/customer360').recordEvent(p, ev));
//   require('node-cron').schedule('*/5 * * * *', () => cart.tick().catch(()=>{}));
//   app.use('/api/ecommerce/carts', require('./routes/abandonedCartRoutes'));
//   // when an order is paid (fulfillment #1): cart.markRecovered(phone)

const express = require('express');
const router = express.Router();

let cart;
try { cart = require('../lib/ecommerce/abandonedCart'); } catch { cart = null; }

function ensure(res) {
  if (!cart) { res.status(503).json({ ok: false, error: 'Cart recovery not available' }); return false; }
  return true;
}

// Track/update a cart. Body: { phone, name?, items?, value?, checkoutLink? }
router.post('/', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, cart: cart.upsertCart(req.body || {}) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Mark recovered (customer ordered). Body: { phone }
router.post('/recovered', (req, res) => {
  if (!ensure(res)) return;
  const c = cart.markRecovered((req.body || {}).phone);
  res.json({ ok: true, cart: c });
});

// List + stats.
router.get('/', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, carts: cart.listCarts({ status: req.query.status }), stats: cart.stats() });
});

module.exports = router;
