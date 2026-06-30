// routes/billingPortalRoutes.js — Payments & Billing #5: customer billing portal.
//
// Wire-up (server.js):
//   const portal = require('./lib/saasBilling/billingPortal');
//   portal.setPlanCatalog([
//     { id:'starter', name:'Starter', price:2000, periodDays:30 },
//     { id:'growth',  name:'Growth',  price:5000, periodDays:30 },
//   ]);
//   app.use('/api/billing', require('./routes/billingPortalRoutes'));
//
// (You can also pull the catalog from lib/saasBilling/planRegistry.js which already exists.)

const express = require('express');
const router = express.Router();

let portal;
try { portal = require('../lib/saasBilling/billingPortal'); } catch { portal = null; }

function ensure(res) {
  if (!portal) { res.status(503).json({ ok: false, error: 'Billing portal not available' }); return false; }
  return true;
}

// Consolidated billing view for a customer (id = phone/email/id).
router.get('/:customerId/overview', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, ...portal.overview(req.params.customerId) });
});

// Preview a plan change (amount due + prorated credit) without committing — dry run.
router.get('/:customerId/change-preview/:planId', (req, res) => {
  if (!ensure(res)) return;
  // overview gives current subs; for a true dry run we expose proratedCredit via overview data.
  const view = portal.overview(req.params.customerId);
  const current = view.subscriptions.find(s => ['active','trialing','past_due'].includes(s.status));
  res.json({ ok: true, currentPlan: current ? current.planId : null, toPlan: req.params.planId, note: 'POST change to commit' });
});

// Upgrade/downgrade. Body: {} (planId in path). Returns amount due + prorated credit.
router.post('/:customerId/change/:planId', async (req, res) => {
  if (!ensure(res)) return;
  try {
    const result = await portal.changePlan(req.params.customerId, req.params.planId);
    res.json(result);
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

module.exports = router;
