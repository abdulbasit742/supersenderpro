 'use strict';
 /**
  * routes/publicSaasFunnelRoutes.js
  * Public funnel: read-only pricing/status + consent-gated lead/demo/trial capture (dry-run).
  * No live email/WhatsApp, no tenant writes, no payment capture, no full PII in responses.
  */
 const express = require('express');
 const router = express.Router();
 const leadCapture = require('../lib/publicSaasFunnel/leadCapture');
 const pricing = require('../lib/publicSaasFunnel/pricing');
 const safety = require('../lib/publicSaasFunnel/safety');
 const store = require('../lib/publicSaasFunnel/store');
 const ok = (res, data) => res.json(Object.assign({ ok: true }, data));
 const bad = (res, code, errors) => res.status(code).json({ ok: false, errors });

 router.get('/status', (req, res) => ok(res, {
   enabled: String(process.env.PUBLIC_FUNNEL_ENABLED || 'true') === 'true',
   dryRun: safety.dryRun(), requireConsent: safety.requireConsent(),
   liveEmail: safety.allowLiveEmail(), tenantWrite: safety.allowTenantWrite(), paymentCapture: safety.allowPaymentCapture(),
 }));
 router.get('/pricing', (req, res) => ok(res, pricing.plans()));
 router.post('/lead', (req, res) => { const r = leadCapture.contact(req.body || {}); return r.ok ? ok(res, r) : bad(res,
 400, r.errors); });
 router.post('/demo-request', (req, res) => { const r = leadCapture.demo(req.body || {}); return r.ok ? ok(res, r) :
 bad(res, 400, r.errors); });
 router.post('/trial-request', (req, res) => { const r = leadCapture.trial(req.body || {}); return r.ok ? ok(res, r) :
 bad(res, 400, r.errors); });
 router.get('/leads', (req, res) => ok(res, { leads: store.listLeads(Number(req.query.limit) || 200) })); // already
 masked
 module.exports = router;
