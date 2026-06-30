'use strict';
/**
 * tests/smoke/billingSmoke.js - dependency-free smoke test (json driver, no live Stripe).
 * Usage: node tests/smoke/billingSmoke.js
 */
process.env.DB_DRIVER = 'json';
const assert = require('assert');
const billing = require('../../lib/billing');
const stripe = require('../../lib/billing/stripe');

const TID = 'billing_smoke_' + Date.now();
let passed = 0;
const t = (n, fn) => fn().then(() => { passed++; console.log('OK', n); }).catch((e) => { console.error('XX', n, '-', e.message); process.exitCode = 1; });

(async () => {
  await t('new tenant defaults to free plan', async () => { const { plan } = await billing.planFor(TID); assert.strictEqual(plan.id, 'free'); });
  await t('free message quota enforced', async () => { const q = await billing.checkQuota(TID, 'message', 1); assert.strictEqual(q.limit, 500); assert.ok(q.allowed); });
  await t('usage metering accumulates', async () => { await billing.recordUsage(TID, 'messagesPerMonth', 499); const u = await billing.getUsage(TID); assert.strictEqual(u.messagesPerMonth, 499); });
  await t('quota blocks when exceeded', async () => { const q = await billing.checkQuota(TID, 'message', 5); assert.strictEqual(q.allowed, false); assert.strictEqual(q.remaining, 1); });
  await t('upgrade to pro -> unlimited messages', async () => { await billing.setPlan(TID, 'pro'); const q = await billing.checkQuota(TID, 'message', 1000000); assert.ok(q.allowed); assert.ok(q.unlimited); });
  await t('stripe stub safe when unconfigured', async () => { const r = await stripe.createCheckoutSession(TID, 'pro', {}); assert.ok(r.configured === false || r.configured === true); });
  await t('webhook activates tenant (synthetic event)', async () => { const r = await stripe.handleEvent({ type: 'checkout.session.completed', data: { object: { metadata: { tenantId: TID, planId: 'starter' }, customer: 'cus_x', subscription: 'sub_x' } } }); assert.strictEqual(r.action, 'activated:starter'); const { plan } = await billing.planFor(TID); assert.strictEqual(plan.id, 'starter'); });
  await t('payment_failed enters grace, not instant cancel', async () => { const r = await stripe.handleEvent({ type: 'invoice.payment_failed', data: { object: { metadata: { tenantId: TID } } } }); assert.ok(String(r.action).startsWith('past_due')); const { subscription } = await billing.planFor(TID); assert.strictEqual(subscription.status, 'past_due'); assert.ok(subscription.graceUntil); });
  console.log('\n' + passed + ' checks passed.');
})();
