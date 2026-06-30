// routes/paymentWebhookRoutes.js — Payments & Billing #1: verify + fulfill in one place.
//
// IMPORTANT: mount this BEFORE any global express.json() so the raw body is intact for HMAC
// verification. Wire-up (server.js), as early as possible in the route chain:
//
//   app.use('/api/payments', require('./routes/paymentWebhookRoutes'));
//
// and register your fulfillment hooks once at startup:
//
//   const fulfillment = require('./lib/paymentGateway/fulfillment');
//   fulfillment.setHooks({
//     markOrderPaid: async (ctx) => { /* flip your order/txn to paid using ctx.orderId */ },
//     activatePlan:  async (ctx) => { /* enable ctx.planId for ctx.customerEmail/phone */ },
//     notifyCustomer: async (ctx) => { /* optional: send WhatsApp receipt */ }
//   });

const express = require('express');
const router = express.Router();

let gw, fulfillment;
try { gw = require('../lib/paymentGateway'); } catch { gw = null; }
try { fulfillment = require('../lib/paymentGateway/fulfillment'); } catch { fulfillment = null; }

// Raw body parser ONLY for the webhook, so signature verification sees the exact bytes.
router.post('/webhook/:gateway', express.raw({ type: '*/*' }), async (req, res) => {
  if (!gw) return res.status(503).json({ ok: false, error: 'Payment gateway not available' });

  const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8')
    : (req.body && req.body.toString ? req.body.toString() : '');

  // 1) Verify authenticity.
  const verification = gw.verifyWebhook(req.params.gateway, rawBody, req.headers);
  if (!verification.verified) {
    return res.status(400).json({ ok: false, verified: false, reason: verification.reason });
  }

  // 2) Fulfill (mark paid + activate). Idempotent on event id.
  if (!fulfillment) {
    // Verified but we can't fulfill — don't 200, so the gateway retries once fulfillment is wired.
    return res.status(503).json({ ok: false, verified: true, error: 'Fulfillment engine not available' });
  }

  let payload;
  try { payload = JSON.parse(rawBody || '{}'); } catch { payload = {}; }

  try {
    const result = await fulfillment.fulfill(req.params.gateway, payload);
    if (!result.ok) {
      // Hook failed — return 5xx so the gateway retries delivery.
      return res.status(500).json({ ok: false, verified: true, ...result });
    }
    // fulfilled | duplicate | ignored all count as "received successfully".
    return res.json({ ok: true, verified: true, ...result });
  } catch (e) {
    return res.status(500).json({ ok: false, verified: true, error: e.message });
  }
});

// Admin: confirm a LOCAL (JazzCash/EasyPaisa/bank) payment by hand. Body: the normalised event
// { paymentRef|eventId, status:'paid', amount, planId?, orderId?, customerPhone?, customerEmail? }
router.post('/local/confirm', express.json(), async (req, res) => {
  if (!fulfillment) return res.status(503).json({ ok: false, error: 'Fulfillment engine not available' });
  try {
    const result = await fulfillment.fulfill('local', { ...(req.body || {}), status: 'paid' });
    res.status(result.ok ? 200 : 500).json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Recent fulfilled payments (admin view).
router.get('/fulfillments', express.json(), (req, res) => {
  if (!fulfillment) return res.status(503).json({ ok: false, error: 'Fulfillment engine not available' });
  res.json({ ok: true, fulfillments: fulfillment.listFulfillments(Number(req.query.limit) || 100) });
});

module.exports = router;
