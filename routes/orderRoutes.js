// routes/orderRoutes.js — Commerce #2: cart + orders.
//
// Wire-up (server.js) — connect 360 + workflow so orders flow into the rest of the system:
//   const orders = require('./lib/commerce/orders');
//   orders.setHooks({
//     record: (phone, ev) => require('./lib/crm/customer360').recordEvent(phone, ev),
//     emitEvent: (e, ctx) => require('./lib/workflows/workflowEngine').emit(e, ctx)
//   });
//   app.use('/api/orders', require('./routes/orderRoutes'));
//
// On payment fulfillment (#payments1), call orders.setOrderStatus(orderId, 'paid').

const express = require('express');
const router = express.Router();

let orders;
try { orders = require('../lib/commerce/orders'); } catch { orders = null; }

function ensure(res) {
  if (!orders) { res.status(503).json({ ok: false, error: 'Orders not available' }); return false; }
  return true;
}

// --- Cart ---
router.get('/cart/:phone', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, cart: orders.getCart(req.params.phone) });
});
router.post('/cart/:phone/add', (req, res) => {
  if (!ensure(res)) return;
  const { productId, qty } = req.body || {};
  try { res.json({ ok: true, cart: orders.addToCart(req.params.phone, productId, qty || 1) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});
router.post('/cart/:phone/remove', (req, res) => {
  if (!ensure(res)) return;
  const cart = orders.removeFromCart(req.params.phone, (req.body || {}).productId);
  res.json({ ok: true, cart });
});
router.post('/cart/:phone/clear', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, ...orders.clearCart(req.params.phone) });
});

// --- Checkout ---
router.post('/cart/:phone/checkout', async (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, order: await orders.checkout(req.params.phone, req.body || {}) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// --- Orders ---
router.get('/', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, orders: orders.listOrders(req.query) });
});
router.get('/:id', (req, res) => {
  if (!ensure(res)) return;
  const o = orders.getOrder(req.params.id);
  if (!o) return res.status(404).json({ ok: false, error: 'Order not found' });
  res.json({ ok: true, order: o });
});
router.post('/:id/status', (req, res) => {
  if (!ensure(res)) return;
  try {
    const o = orders.setOrderStatus(req.params.id, (req.body || {}).status);
    if (!o) return res.status(404).json({ ok: false, error: 'Order not found' });
    res.json({ ok: true, order: o });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

module.exports = router;
