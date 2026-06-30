// routes/billingPortalRoutes.js — Payments & Billing #5: customer billing portal.
//
// Wire-up (server.js):
//   const portal = require('./lib/saasBilling/billingPortal');
//   portal.setPlanCatalog(() => require('./lib/saasBilling/planRegistry').listPlans()); // if available
//   app.use('/api/billing', require('./routes/billingPortalRoutes'));
//
// Frontend "My Billing" page: GET /overview to render plan + history + dunning; POST /change-plan to
// upgrade/downgrade. A real charge for an upgrade should still go through /api/payments/checkout.

const express = require('express');
const router = express.Router();

let portal;
try { portal = require('../lib/saasBilling/billingPortal'); } catch { portal = null; }

function ensure(res) {
  if (!portal) { res.status(503).json({ ok: false, error: 'Billing portal not available' }); return false; }
  return true;
}

// Full billing overview for a customer (id = phone/email/id).
router.get('/customer/:id/overview', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, ...portal.overview(req.params.id) }); }
  catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Change plan. Body: { newPlanId, immediate?: boolean }
router.post('/customer/:id/change-plan', async (req, res) => {
  if (!ensure(res)) return;
  const { newPlanId, immediate } = req.body || {};
  try {
    const result = await portal.changePlan(req.params.id, newPlanId, { immediate: !!immediate });
    res.json(result);
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

module.exports = router;
