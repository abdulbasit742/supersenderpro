// routes/customer360Routes.js — CRM #1: unified customer profile.
//
// Wire-up (server.js):
//   const c360 = require('./lib/crm/customer360');
//   const loyalty = require('./lib/marketing/loyaltyEngine'); // if merged
//   c360.configure({
//     loadContact:       (k) => findContact(k),
//     loadOrders:        (k) => ordersForCustomer(k),
//     loadMessages:      (k) => messagesForCustomer(k),
//     loadLoyalty:       (k) => loyalty.getAccount(k),
//     loadSubscriptions: (k) => subs.listForCustomer(k),
//   });
//   app.use('/api/crm/customer360', require('./routes/customer360Routes'));
//
// Then point the marketing segment engine's contact loader at c360.getProfiles(allKeys) so segments
// can target ANY 360 field (totalSpent, lifecycleStage, loyaltyTier, hasActiveSubscription, ...).

const express = require('express');
const router = express.Router();

let c360;
try { c360 = require('../lib/crm/customer360'); } catch { c360 = null; }

function ensure(res) {
  if (!c360) { res.status(503).json({ ok: false, error: 'Customer 360 not available' }); return false; }
  return true;
}

// Full profile for one customer (id = phone/email/id).
router.get('/:id', async (req, res) => {
  if (!ensure(res)) return;
  try {
    res.json({ ok: true, profile: await c360.getProfile(req.params.id) });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// Build flat profiles for many keys (POST { keys: [...] }) — handy to feed segments/exports.
router.post('/batch', async (req, res) => {
  if (!ensure(res)) return;
  const keys = (req.body || {}).keys || [];
  try {
    res.json({ ok: true, profiles: await c360.getProfiles(keys) });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

module.exports = router;
