// routes/paymentGatewayRoutes.js
const express = require('express');
const router = express.Router();
let gw; try { gw = require('../lib/paymentGateway'); } catch(e){ gw = null; }

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

router.post('/webhook/:gateway', express.raw({ type:'*/*' }), (req, res) => {
  if (!gw) return res.status(503).end();
  const rawBody = (req.body && req.body.toString) ? req.body.toString() : '';
  const result = gw.verifyWebhook(req.params.gateway, rawBody, req.headers);
  if (!result.verified) { return res.status(400).json({ ok:false, ...result }); }
  res.json({ ok:true, received:true });
});

module.exports = router;