// routes/customer360Routes.js — CRM Feature #1: unified Customer 360.
//
// Wire-up (server.js): register providers so the 360 view pulls live data from existing systems.
//   const c360 = require('./lib/crm/customer360');
//   c360.registerProvider('orders',        (key) => ordersSummaryFor(key));        // your order data
//   c360.registerProvider('loyalty',       (key) => loyalty.getAccount(key));       // marketing #4
//   c360.registerProvider('subscriptions', (key) => subs.listForCustomer(key));     // payments #2
//   c360.registerProvider('messages',      (key) => inboxSummaryFor(key));          // chat history
//   app.use('/api/crm/customers', require('./routes/customer360Routes'));
//
// Bonus: use c360.getProfilesFor(contacts) as the contact loader for marketing segments so rules can
// match on totalSpent / loyaltyTier / hasActiveSub out of the box.

const express = require('express');
const router = express.Router();

let c360;
try { c360 = require('../lib/crm/customer360'); } catch { c360 = null; }

function ensure(res) {
  if (!c360) { res.status(503).json({ ok: false, error: 'Customer 360 not available' }); return false; }
  return true;
}

// Full unified profile.
router.get('/:id', async (req, res) => {
  if (!ensure(res)) return;
  try {
    const profile = await c360.getProfile(req.params.id);
    if (!profile) return res.status(404).json({ ok: false, error: 'No profile' });
    res.json({ ok: true, profile });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Create/update identity. Body: { phone, name?, email?, city?, optedIn? }
router.post('/', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, profile: c360.upsertIdentity(req.body || {}) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Tags.
router.post('/:id/tags', (req, res) => {
  if (!ensure(res)) return;
  const p = c360.addTag(req.params.id, (req.body || {}).tag);
  if (!p) return res.status(404).json({ ok: false, error: 'No profile' });
  res.json({ ok: true, profile: p });
});
router.delete('/:id/tags/:tag', (req, res) => {
  if (!ensure(res)) return;
  const p = c360.removeTag(req.params.id, req.params.tag);
  if (!p) return res.status(404).json({ ok: false, error: 'No profile' });
  res.json({ ok: true, profile: p });
});

// Notes. Body: { text, author? }
router.post('/:id/notes', (req, res) => {
  if (!ensure(res)) return;
  const { text, author } = req.body || {};
  const p = c360.addNote(req.params.id, text, author);
  if (!p) return res.status(404).json({ ok: false, error: 'No profile' });
  res.json({ ok: true, profile: p });
});

module.exports = router;
