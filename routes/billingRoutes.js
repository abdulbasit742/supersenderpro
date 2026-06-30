'use strict';
/**
 * routes/billingRoutes.js - Phase 2 billing API. Mounted at /api/billing (see BILLING HOOK).
 * Wire: node scripts/wire-billing.js
 *
 * /webhook/stripe MUST receive the raw body for signature verification -> express.raw().
 * Authenticated endpoints use requireAuth from PR #90 when available.
 */
const express = require('express');
const billing = require('../lib/billing');
const stripe = require('../lib/billing/stripe');

let requireAuth = (req, res, next) => next();
let requireRole = () => (req, res, next) => next();
try { const m = require('../middleware/authMiddleware'); requireAuth = m.requireAuth; requireRole = m.requireRole; } catch {}

const router = express.Router();
const ok = (res, d) => res.json(Object.assign({ success: true }, d));
const fail = (res, e, c = 400) => res.status(c).json({ success: false, error: e && e.message ? e.message : String(e) });
const tid = (req) => req.tenantId || req.get('x-tenant-id') || (req.body && req.body.tenantId) || req.query.tenantId || 'default';

/* ---- public ---- */
router.get('/plans', (req, res) => ok(res, { plans: billing.plans.getPlans() }));

/* ---- authed tenant ---- */
router.get('/subscription', requireAuth, async (req, res) => { try { ok(res, await billing.planFor(tid(req))); } catch (e) { fail(res, e, 500); } });
router.get('/usage', requireAuth, async (req, res) => { try { ok(res, { usage: await billing.getUsage(tid(req)) }); } catch (e) { fail(res, e, 500); } });
router.post('/quota/check', requireAuth, async (req, res) => { try { ok(res, { quota: await billing.checkQuota(tid(req), (req.body || {}).metric, (req.body || {}).qty || 1) }); } catch (e) { fail(res, e); } });
router.post('/checkout', requireAuth, async (req, res) => {
  try {
    const { planId, successUrl, cancelUrl } = req.body || {};
    const r = await stripe.createCheckoutSession(tid(req), planId, { successUrl, cancelUrl, customerEmail: req.user && req.user.email });
    ok(res, { checkout: r });
  } catch (e) { fail(res, e); }
});

/* ---- admin override (manual plan set, e.g. comped accounts) ---- */
router.post('/subscription/plan', requireAuth, requireRole('owner'), async (req, res) => { try { ok(res, { subscription: await billing.setPlan(tid(req), (req.body || {}).planId, {}) }); } catch (e) { fail(res, e); } });

/* ---- Stripe webhook (public, raw body, signature-verified) ---- */
router.post('/webhook/stripe', express.raw({ type: '*/*' }), async (req, res) => {
  const v = stripe.verifyWebhook(req.body, req.get('stripe-signature'));
  if (!v.ok) return res.status(400).json({ success: false, error: 'webhook verify failed: ' + v.error });
  try { const result = await stripe.handleEvent(v.event); return res.json({ received: true, result }); }
  catch (e) { return res.status(500).json({ success: false, error: e.message }); }
});

module.exports = router;
