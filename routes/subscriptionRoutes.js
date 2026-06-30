// routes/subscriptionRoutes.js — Payments & Billing #2: subscription lifecycle API.
//
// Wire-up (server.js):
//   const subs = require('./lib/saasBilling/subscriptionLifecycle');
//   subs.setHooks({
//     onExpire:  (s) => revokeAccess(s.customer, s.planId),
//     onActivate:(s) => grantAccess(s.customer, s.planId),
//     onPastDue: (s) => startDunning(s),   // payments #4
//   });
//   require('node-cron').schedule('0 * * * *', () => subs.tick().catch(()=>{})); // hourly sweep
//   app.use('/api/subscriptions', require('./routes/subscriptionRoutes'));
//
// And from payment fulfillment (#1), call subs.activate(customer, planId) in activateSubscription.

const express = require('express');
const router = express.Router();

let subs;
try { subs = require('../lib/saasBilling/subscriptionLifecycle'); } catch { subs = null; }

function ensure(res) {
  if (!subs) { res.status(503).json({ ok: false, error: 'Subscription engine not available' }); return false; }
  return true;
}

// All subscriptions for a customer (id = phone/email/id).
router.get('/customer/:id', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, subscriptions: subs.listForCustomer(req.params.id) });
});

// One subscription (customer + plan).
router.get('/customer/:id/plan/:planId', (req, res) => {
  if (!ensure(res)) return;
  const sub = subs.getSubscription(req.params.id, req.params.planId);
  if (!sub) return res.status(404).json({ ok: false, error: 'No subscription' });
  res.json({ ok: true, subscription: sub, access: subs.hasAccess(req.params.id, req.params.planId) });
});

// Access check (handy for gating features).
router.get('/customer/:id/plan/:planId/access', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, access: subs.hasAccess(req.params.id, req.params.planId) });
});

// Cancel. Body: { immediate?: boolean }
router.post('/customer/:id/plan/:planId/cancel', async (req, res) => {
  if (!ensure(res)) return;
  const sub = await subs.cancel(req.params.id, req.params.planId, { immediate: !!(req.body || {}).immediate });
  if (!sub) return res.status(404).json({ ok: false, error: 'No subscription' });
  res.json({ ok: true, subscription: sub });
});

// Manually flag a failed renewal (e.g. recurring charge declined). Enters grace.
router.post('/customer/:id/plan/:planId/renewal-failed', async (req, res) => {
  if (!ensure(res)) return;
  const sub = await subs.markRenewalFailed(req.params.id, req.params.planId);
  if (!sub) return res.status(404).json({ ok: false, error: 'No subscription' });
  res.json({ ok: true, subscription: sub });
});

// Run the lifecycle sweep once (testing without waiting for cron).
router.post('/tick', async (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, result: await subs.tick() }); }
  catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
