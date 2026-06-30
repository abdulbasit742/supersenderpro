// routes/paymentGatewayRoutes.js
const express = require('express');
const router = express.Router();
let gw; try { gw = require('../lib/paymentGateway'); } catch(e){ gw = null; }
let fulfillment; try { fulfillment = require('../lib/paymentGateway/fulfillment'); } catch(e){ fulfillment = null; }

router.get('/status', (req, res) => {
  if (!gw) return res.json({ ok:false, error:'Payment gateway module not loaded' });
  res.json({ ok:true, ...gw.getStatus() });
});

router.post('/checkout', async (req, res) => {
  if (!gw) return res.status(503).json({ ok:false, error:'Payment gateway not available' });
  try {
    const base = process.env.PUBLIC_BASE_URL || (req.protocol + '://' + req.get('host'));
    const opts = Object.assign({}, req.body, {
      successUrl: req.body.successUrl || (base + '/payment-success.html'),
      cancelUrl: req.body.cancelUrl || (base + '/pricing.html'),
    });
    if (!opts.planId || !opts.planName || !opts.amount) return res.status(400).json({ ok:false, error:'planId, planName and amount are required' });
    const result = await gw.createCheckout(opts);
    res.json({ ok:true, ...result });
  } catch(e) { res.status(500).json({ ok:false, error:e.message }); }
});

// Stripe (and other signature-based) webhook. Verifies THEN fulfills.
// NOTE: express.raw must run for this path BEFORE any global express.json(), or the HMAC check
// will fail because the raw body was already consumed. (See docs/CRITICAL_FIXES.md #4.)
router.post('/webhook/:gateway', express.raw({ type:'*/*' }), async (req, res) => {
  if (!gw) return res.status(503).end();
  const rawBody = (req.body && req.body.toString) ? req.body.toString() : '';
  const result = gw.verifyWebhook(req.params.gateway, rawBody, req.headers);
  if (!result.verified) { return res.status(400).json({ ok:false, ...result }); }

  // Verified — now actually deliver value. This is the step that was missing.
  if (fulfillment) {
    try {
      let payload = {};
      try { payload = rawBody ? JSON.parse(rawBody) : {}; } catch { payload = {}; }
      const f = await fulfillment.fulfillPayment(req.params.gateway, payload);
      return res.json({ ok:true, received:true, fulfillment:f });
    } catch (e) {
      // Verified but fulfillment failed: 200 so the gateway doesn't hammer retries, but flag it.
      return res.json({ ok:true, received:true, fulfillmentError:e.message });
    }
  }
  res.json({ ok:true, received:true });
});

// Local gateway confirmation (JazzCash/EasyPaisa/bank). Body is our own confirmation shape:
// { paymentRef, amount, planId?, orderId?, phone?, email?, paid? }
// Protect this with an admin token so randoms can't mark payments as paid.
router.post('/webhook/local', express.json(), async (req, res) => {
  if (!fulfillment) return res.status(503).json({ ok:false, error:'Fulfillment not available' });
  const adminToken = process.env.PAYMENT_ADMIN_TOKEN || '';
  if (adminToken && req.headers['x-admin-token'] !== adminToken) {
    return res.status(401).json({ ok:false, error:'unauthorized' });
  }
  try {
    const f = await fulfillment.fulfillPayment('local', req.body || {});
    res.json({ ok:true, ...f });
  } catch (e) {
    res.status(500).json({ ok:false, error:e.message });
  }
});

// Debug: recent fulfillments.
router.get('/fulfillment-log', (req, res) => {
  if (!fulfillment) return res.status(503).json({ ok:false, error:'Fulfillment not available' });
  res.json({ ok:true, log: fulfillment.getFulfillmentLog(Number(req.query.limit) || 100) });
});

module.exports = router;
