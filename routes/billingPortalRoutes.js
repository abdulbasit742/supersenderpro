// routes/billingPortalRoutes.js — Payments & Billing #5: customer billing portal.
//
// Wire-up (server.js):
//   app.use('/api/billing', require('./routes/billingPortalRoutes'));
//
// Frontend "My Billing" page calls GET /api/billing/:customerId for the full picture, and
// POST /api/billing/:customerId/change-plan to upgrade/downgrade.

const express = require('express');
const router = express.Router();

let portal;
try { portal = require('../lib/saasBilling/billingPortal'); } catch { portal = null; }

function ensure(res) {
  if (!portal) { res.status(503).json({ ok: false, error: 'Billing portal not available' }); return false; }
  return true;
}

// Full billing overview for a customer (id = phone/email/id).
router.get('/:customerId', (req, res) => {
  if (!ensure(res)) return;
  try {
    res.json({ ok: true, billing: portal.getCustomerBilling(req.params.customerId) });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Change plan (upgrade/downgrade). Body: { fromPlanId?, toPlanId }
router.post('/:customerId/change-plan', async (req, res) => {
  if (!ensure(res)) return;
  const { fromPlanId, toPlanId } = req.body || {};
  try {
    const result = await portal.changePlan(req.params.customerId, fromPlanId, toPlanId);
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

module.exports = router;
