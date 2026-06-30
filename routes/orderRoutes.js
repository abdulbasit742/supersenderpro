// routes/orderRoutes.js — Commerce #2: cart + orders.
//
// Wire-up (server.js) — emit order events so loyalty/360/payment react:
//   const orders = require('./lib/commerce/orders');
//   orders.setEmitter((event, ctx) => {
//     require('./lib/workflows/workflowEngine').emit(event, ctx);
//     require('./lib/crm/customer360').recordEvent(ctx.phone, { type:'order', amount: ctx.amount, ref: ctx.orderId });
//   });
//   app.use('/api/orders', require('./routes/orderRoutes'));

const express = require('express');
const router = express.Router();

let orders;
try { orders = require('../lib/commerce/orders'); } catch { orders = null; }

function ensure(res) {
  if (!orders) { res.status(503).json({ ok: false, error: 'Orders not available' }); return false; }
  return true;
}

// Cart for a contact.
router.get('/cart/:phone', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, cart: orders.getCart(req.params.phone) });
});

// Add to cart. Body: { productId, qty? }
router.post('/cart/:phone/add', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, cart: orders.addToCart(req.params.phone, (req.body||{}).productId, (req.body||{}).qty || 1) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Remove from cart. Body: { productId }
router.post('/cart/:phone/remove', (req, res) => {
  if (!ensure(res)) return;
  const cart = orders.removeFromCart(req.params.phone, (req.body||{}).productId);
  res.json({ ok: true, cart });
});

// Checkout. Body: { note? }
router.post('/cart/:phone/checkout', async (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, order: await orders.checkout(req.params.phone, req.body || {}) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Orders list. Query: ?contactPhone=&status=
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

// Update status. Body: { status }
router.post('/:id/status', (req, res) => {
  if (!ensure(res)) return;
  try {
    const o = orders.setOrderStatus(req.params.id, (req.body||{}).status);
    if (!o) return res.status(404).json({ ok: false, error: 'Order not found' });
    res.json({ ok: true, order: o });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

module.exports = router;
