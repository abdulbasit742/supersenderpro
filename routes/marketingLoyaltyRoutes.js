// routes/marketingLoyaltyRoutes.js — Marketing Automation #4: loyalty + referrals.
//
// Wire-up (server.js):
//   app.use('/api/marketing/loyalty', require('./routes/marketingLoyaltyRoutes'));
//
// To make tiers/points visible to segments, use loyaltyEngine.enrichContact in your CRM contact
// loader so every contact carries loyaltyPoints / loyaltyTier (then segment on those).

const express = require('express');
const router = express.Router();

let loyalty;
try { loyalty = require('../lib/marketing/loyaltyEngine'); } catch { loyalty = null; }

function ensure(res) {
  if (!loyalty) { res.status(503).json({ ok: false, error: 'Loyalty engine not available' }); return false; }
  return true;
}

// Account lookup. :id is a phone or contact id.
router.get('/account/:id', (req, res) => {
  if (!ensure(res)) return;
  const acc = loyalty.getAccount(req.params.id);
  if (!acc) return res.status(404).json({ ok: false, error: 'No loyalty account' });
  res.json({ ok: true, account: acc });
});

// Earn points directly. Body: { amount, reason? }
router.post('/account/:id/earn', (req, res) => {
  if (!ensure(res)) return;
  try {
    const { amount, reason } = req.body || {};
    res.json({ ok: true, account: loyalty.earn(req.params.id, amount, reason) });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Earn from an order total. Body: { orderTotal, reason? }
router.post('/account/:id/earn-order', (req, res) => {
  if (!ensure(res)) return;
  try {
    const { orderTotal, reason } = req.body || {};
    res.json({ ok: true, account: loyalty.earnFromOrder(req.params.id, orderTotal, reason) });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Redeem points. Body: { amount, reason? }
router.post('/account/:id/redeem', (req, res) => {
  if (!ensure(res)) return;
  try {
    const { amount, reason } = req.body || {};
    res.json({ ok: true, account: loyalty.redeem(req.params.id, amount, reason) });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// --- Referrals ---

// Get/create this contact's referral code.
router.get('/account/:id/referral-code', (req, res) => {
  if (!ensure(res)) return;
  try {
    res.json({ ok: true, code: loyalty.getOrCreateReferralCode(req.params.id) });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Register a new contact as referred. Body: { referee: <phone/id>, code }
router.post('/referrals/register', (req, res) => {
  if (!ensure(res)) return;
  const { referee, code } = req.body || {};
  const out = loyalty.registerReferral(referee, code);
  res.status(out.ok ? 200 : 400).json(out);
});

// Mark a referee converted (e.g. first paid order). Body: { referee }
router.post('/referrals/convert', (req, res) => {
  if (!ensure(res)) return;
  const { referee } = req.body || {};
  const out = loyalty.convertReferral(referee);
  res.status(out.ok ? 200 : 400).json(out);
});

module.exports = router;
