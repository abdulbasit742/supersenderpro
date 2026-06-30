// routes/customer360Routes.js — CRM #1: unified customer profile.
//
// Wire-up (server.js): inject loaders from your existing data, then mount.
//   const c360 = require('./lib/crm/customer360');
//   c360.configure({
//     contact: (key) => findContact(key),
//     orders:  (key) => ordersForCustomer(key),
//     messages:(key) => messagesForCustomer(key),
//     loyalty: (key) => require('./lib/marketing/loyaltyEngine').getAccount(key),
//     subscriptions: (key) => require('./lib/saasBilling/subscriptionLifecycle').listForCustomer(key),
//   });
//   app.use('/api/crm/customers', require('./routes/customer360Routes'));
//
// Bonus: use c360.toSegmentContact in your segment contact loader so segments can target spend,
// recency, loyalty tier, etc. with zero extra wiring.

const express = require('express');
const router = express.Router();

let c360;
try { c360 = require('../lib/crm/customer360'); } catch { c360 = null; }

function ensure(res) {
  if (!c360) { res.status(503).json({ ok: false, error: 'Customer 360 not available' }); return false; }
  return true;
}

// Full 360 profile (id = phone/email/id).
router.get('/:id', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, profile: c360.getProfile(req.params.id) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Flattened segment-contact view (handy to debug what segments will see).
router.get('/:id/segment-view', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, contact: c360.toSegmentContact(req.params.id) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

module.exports = router;
