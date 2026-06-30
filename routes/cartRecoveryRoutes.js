'use strict';
// #80 Abandoned Cart Recovery — HTTP routes. Mount: app.use('/api/cart-recovery', require('./routes/cartRecoveryRoutes'));
const express = require('express');
const router = express.Router();
const cart = require('../lib/cartRecovery');
const { maskCart } = require('../lib/cartRecovery/privacy');

function tenantOf(req) { return (req.headers['x-tenant-id'] || (req.user && req.user.tenantId) || req.query.tenantId || 'default'); }

router.get('/health', (req, res) => res.json(cart.doctor.check()));

// Track cart activity
router.post('/track', (req, res) => {
  try {
    const { cartId, contactId, value, items } = req.body || {};
    const out = cart.track({ tenantId: tenantOf(req), cartId, contactId, value, items });
    res.json(Object.assign({}, out, { cart: maskCart(out.cart) }));
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Mark cart paid
router.post('/paid', (req, res) => {
  const { cartId } = req.body || {};
  const out = cart.markPaid({ tenantId: tenantOf(req), cartId });
  res.status(out.ok ? 200 : 400).json(Object.assign({}, out, { cart: maskCart(out.cart) }));
});

// Run a recovery cycle (detect + draft due nudges)
router.post('/run', (req, res) => {
  const out = cart.runCycle();
  res.json({ ok: true, abandoned: out.abandoned, draftCount: (out.drafts || []).length, drafts: out.drafts });
});

// List carts by status
router.get('/list', (req, res) => {
  const db = cart.store.load();
  const rows = cart.store.list(db, tenantOf(req), req.query.status).map(maskCart);
  res.json({ ok: true, count: rows.length, carts: rows });
});

module.exports = router;
