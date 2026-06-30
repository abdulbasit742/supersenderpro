// routes/paymentFulfillmentRoutes.js — REST surface for the Payment Fulfillment bridge.
// Mount at /api/payment-fulfillment. The /webhook/:gateway endpoint is the actual fix for the
// fulfillment gap: it verifies the Stripe signature (via lib/paymentGateway) and then fulfills.

const express = require('express');
const router = express.Router();

let pf = null; try { pf = require('../lib/paymentFulfillment'); } catch (e) { pf = null; }
let gw = null; try { gw = require('../lib/paymentGateway'); } catch (e) { gw = null; }
let saas = null; try { saas = require('../lib/saasBilling'); } catch (e) { saas = null; }

function requireAdmin(req, res, next) {
 const token = process.env.PAYMENT_FULFILLMENT_ADMIN_TOKEN || '';
 if (!token) return next(); // no token configured -> open (dev convenience)
 if ((req.headers['x-admin-token'] || '') === token) return next();
 return res.status(401).json({ ok: false, error: 'admin token required' });
}

router.get('/status', (req, res) => {
 if (!pf) return res.json({ ok: false, error: 'payment fulfillment module not loaded' });
 const report = pf.doctor.run();
 res.json({ ok: true, posture: report.posture, gateway: report.gateway, counts: report.counts });
});

router.get('/doctor', (req, res) => {
 if (!pf) return res.status(503).json({ ok: false });
 res.json(pf.doctor.run());
});

router.get('/overview', (req, res) => {
 if (!pf) return res.status(503).json({ ok: false });
 let billing = null; try { billing = saas ? saas.billingStatus.overview() : null; } catch (_e) { billing = null; }
 res.json({ ok: true, billing, fulfillments: pf.fulfillmentEngine.list(20) });
});

router.post('/checkout', async (req, res) => {
 if (!pf) return res.status(503).json({ ok: false, error: 'not available' });
 try {
 const base = process.env.PUBLIC_BASE_URL || (req.protocol + '://' + req.get('host'));
 const out = await pf.checkoutOrchestrator.startCheckout(Object.assign({}, req.body, {
 successUrl: req.body.successUrl || (base + '/payment-success.html'),
 cancelUrl: req.body.cancelUrl || (base + '/pricing.html'),
 }));
 res.json(out);
 } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// THE FIX: a verified payment webhook now actually fulfills.
router.post('/webhook/:gateway', express.raw({ type: '*/*' }), async (req, res) => {
 if (!pf) return res.status(503).end();
 const gateway = req.params.gateway;
 const rawBody = (req.body && req.body.toString) ? req.body.toString() : '';
 try {
 if (gateway === 'stripe') {
 const verify = gw ? gw.verifyWebhook('stripe', rawBody, req.headers) : { verified: false, reason: 'gateway missing' };
 if (!verify.verified) return res.status(400).json({ ok: false, ...verify });
 let event = null; try { event = JSON.parse(rawBody); } catch (_e) { return res.status(400).json({ ok: false, error: 'invalid json body' }); }
 const result = await pf.webhookHandlers.handleStripe(event);
 return res.json({ ok: true, ...result });
 }
 return res.status(400).json({ ok: false, error: 'unsupported signed gateway; use POST /manual-verify for local rails' });
 } catch (e) { return res.status(500).json({ ok: false, error: e.message }); }
});

// Local PKR (JazzCash/EasyPaisa/bank) — admin/verifier confirms a payment reference.
router.post('/manual-verify', requireAdmin, async (req, res) => {
 if (!pf) return res.status(503).json({ ok: false });
 try { const result = await pf.webhookHandlers.handleLocal(req.body || {}); res.json({ ok: true, ...result }); }
 catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

router.get('/fulfillments', (req, res) => {
 if (!pf) return res.status(503).json({ ok: false });
 res.json({ ok: true, items: pf.fulfillmentEngine.list(Number(req.query.limit) || 100) });
});

router.get('/receipts/:tenantId', (req, res) => {
 if (!pf) return res.status(503).json({ ok: false });
 res.json({ ok: true, items: pf.receiptBuilder.listForTenant(req.params.tenantId) });
});

router.get('/reminders', (req, res) => {
 if (!pf) return res.status(503).json({ ok: false });
 res.json({ ok: true, due: pf.reminderScheduler.due(), tenant: req.query.tenantId ? pf.reminderScheduler.scheduledFor(req.query.tenantId) : undefined });
});

router.post('/reminders/run', requireAdmin, async (req, res) => {
 if (!pf) return res.status(503).json({ ok: false });
 const lookup = saas ? (id) => { try { return saas.planRegistry.getPlan(id); } catch (_e) { return null; } } : null;
 const out = await pf.reminderScheduler.run(Date.now(), lookup);
 res.json({ ok: true, ...out });
});

// Expose the notifier setter for server-side wiring (WhatsApp/email send fn).
router.setNotifier = (fn) => (pf ? pf.notify.setNotifier(fn) : false);

module.exports = router;
