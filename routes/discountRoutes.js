// routes/discountRoutes.js — Commerce #5: discount codes.
//
// Wire-up (server.js):
//   app.use('/api/discounts', require('./routes/discountRoutes'));
//
// At checkout: const v = require('./lib/commerce/discounts').apply(code, { amount, customerPhone, orderId });
//   if (v.ok) finalTotal = v.total;

const express = require('express');
const router = express.Router();

let disc;
try { disc = require('../lib/commerce/discounts'); } catch { disc = null; }

function ensure(res) {
  if (!disc) { res.status(503).json({ ok: false, error: 'Discounts not available' }); return false; }
  return true;
}

router.get('/', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, codes: disc.listCodes() });
});

// Create. Body: { code, type, value, minOrder?, maxUses?, perCustomer?, expiresAt? }
router.post('/', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, code: disc.createCode(req.body || {}) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Validate (dry). Body: { code, amount, customerPhone? }
router.post('/validate', (req, res) => {
  if (!ensure(res)) return;
  const { code, amount, customerPhone } = req.body || {};
  res.json({ ok: true, result: disc.validate(code, { amount, customerPhone }) });
});

// Apply (records redemption). Body: { code, amount, customerPhone?, orderId? }
router.post('/apply', (req, res) => {
  if (!ensure(res)) return;
  const { code, amount, customerPhone, orderId } = req.body || {};
  res.json({ ok: true, result: disc.apply(code, { amount, customerPhone, orderId }) });
});

// Deactivate.
router.post('/:code/deactivate', (req, res) => {
  if (!ensure(res)) return;
  const c = disc.deactivate(req.params.code);
  if (!c) return res.status(404).json({ ok: false, error: 'Code not found' });
  res.json({ ok: true, code: c });
});

module.exports = router;
