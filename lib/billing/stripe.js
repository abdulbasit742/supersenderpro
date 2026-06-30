'use strict';
/**
 * lib/billing/stripe.js - Stripe checkout + webhook lifecycle.
 * Safe stub: if STRIPE_SECRET_KEY is unset, methods return a clear 'not configured'
 * result instead of throwing, so the app runs in dev without Stripe.
 *
 * Webhook handling is idempotent and maps subscription events to tenant activate/deactivate,
 * including dunning (past_due) with a grace period before hard deactivation.
 */
const crypto = require('crypto');
const billing = require('./index');
const plans = require('./plans');

const SECRET = process.env.STRIPE_SECRET_KEY || '';
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const GRACE_DAYS = Number(process.env.BILLING_GRACE_DAYS || 3);
const configured = () => !!SECRET;

let stripe = null;
function client() {
  if (!configured()) return null;
  if (stripe) return stripe;
  try { stripe = require('stripe')(SECRET); } catch { stripe = null; }
  return stripe;
}

// Create a Checkout Session for a tenant upgrading to a paid plan.
async function createCheckoutSession(tenantId, planId, { successUrl, cancelUrl, customerEmail } = {}) {
  const plan = plans.getPlan(planId);
  if (!plan) throw new Error('unknown plan: ' + planId);
  if (!configured()) return { configured: false, note: 'STRIPE_SECRET_KEY not set - cannot create live checkout', planId };
  const s = client();
  if (!s) return { configured: false, note: 'stripe sdk not installed (npm i stripe)' };
  if (!plan.stripePriceId) throw new Error('plan ' + planId + ' has no stripePriceId configured');
  const session = await s.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    success_url: successUrl || (process.env.APP_URL || '') + '/billing/success?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: cancelUrl || (process.env.APP_URL || '') + '/billing/cancel',
    customer_email: customerEmail,
    client_reference_id: tenantId,
    metadata: { tenantId, planId },
  });
  return { configured: true, id: session.id, url: session.url };
}

// Verify webhook signature. Uses the Stripe SDK when present, else a manual HMAC check.
function verifyWebhook(rawBody, sigHeader) {
  if (!WEBHOOK_SECRET) return { ok: false, error: 'STRIPE_WEBHOOK_SECRET not set' };
  const s = client();
  if (s && s.webhooks) {
    try { return { ok: true, event: s.webhooks.constructEvent(rawBody, sigHeader, WEBHOOK_SECRET) }; }
    catch (e) { return { ok: false, error: e.message }; }
  }
  // Manual verification (t=...,v1=...)
  try {
    const parts = Object.fromEntries(String(sigHeader || '').split(',').map((kv) => kv.split('=')));
    const signed = parts.t + '.' + (Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody);
    const expected = crypto.createHmac('sha256', WEBHOOK_SECRET).update(signed).digest('hex');
    if (parts.v1 && crypto.timingSafeEqual(Buffer.from(parts.v1), Buffer.from(expected))) {
      return { ok: true, event: JSON.parse(Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody) };
    }
    return { ok: false, error: 'signature mismatch' };
  } catch (e) { return { ok: false, error: e.message }; }
}

// Map a Stripe event to tenant subscription state. Idempotent.
async function handleEvent(event) {
  if (!event || !event.type) return { handled: false };
  const obj = (event.data && event.data.object) || {};
  const tenantId = (obj.metadata && obj.metadata.tenantId) || obj.client_reference_id;
  const result = { type: event.type, tenantId: tenantId || null, handled: true };

  switch (event.type) {
    case 'checkout.session.completed': {
      if (!tenantId) break;
      const planId = (obj.metadata && obj.metadata.planId) || plans.defaultPlanId();
      await billing.setPlan(tenantId, planId, { status: 'active', provider: 'stripe', stripeCustomerId: obj.customer, stripeSubscriptionId: obj.subscription, graceUntil: null });
      result.action = 'activated:' + planId;
      break;
    }
    case 'invoice.payment_succeeded': {
      if (tenantId) { await billing.setStatus(tenantId, 'active', { graceUntil: null }); result.action = 'renewed'; }
      break;
    }
    case 'invoice.payment_failed': {
      // Dunning: enter grace, deactivate only after grace window elapses.
      if (tenantId) { await billing.setStatus(tenantId, 'past_due', { graceUntil: new Date(Date.now() + GRACE_DAYS * 86400000).toISOString() }); result.action = 'past_due (grace ' + GRACE_DAYS + 'd)'; }
      break;
    }
    case 'customer.subscription.deleted': {
      if (tenantId) { await billing.setPlan(tenantId, plans.defaultPlanId(), { status: 'canceled' }); result.action = 'downgraded_to_free'; }
      break;
    }
    default: result.action = 'ignored';
  }
  return result;
}

module.exports = { configured, createCheckoutSession, verifyWebhook, handleEvent };
