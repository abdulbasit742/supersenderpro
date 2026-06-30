'use strict';
// #71 Loyalty & Points — HTTP routes. Mount: app.use('/api/loyalty', require('./routes/loyaltyRoutes'));
const express = require('express');
const router = express.Router();
const loyalty = require('../lib/loyalty');
const { maskAccount, maskLedger } = require('../lib/loyalty/privacy');

function tenantOf(req) { return (req.headers['x-tenant-id'] || (req.user && req.user.tenantId) || req.query.tenantId || 'default'); }

// Health
router.get('/health', (req, res) => res.json(loyalty.doctor.check()));

// Balance for a contact
router.get('/balance/:contactId', (req, res) => {
  try {
    const out = loyalty.balance(tenantOf(req), req.params.contactId);
    res.json({ ok: true, account: maskAccount(out.account), tier: out.tier, next: out.next });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Leaderboard / list accounts (masked)
router.get('/accounts', (req, res) => {
  const db = loyalty.store.load();
  const rows = loyalty.store.listAccounts(db, tenantOf(req))
    .sort((a, b) => b.balance - a.balance)
    .slice(0, Number(req.query.limit) || 100)
    .map(maskAccount);
  res.json({ ok: true, count: rows.length, accounts: rows });
});

// Ledger for a contact (masked)
router.get('/ledger/:contactId', (req, res) => {
  const db = loyalty.store.load();
  const rows = loyalty.store.listLedger(db, tenantOf(req), req.params.contactId).map(maskLedger);
  res.json({ ok: true, count: rows.length, ledger: rows });
});

// Earn (manual / integration)
router.post('/earn', (req, res) => {
  try {
    const { contactId, amount, orderId, reason } = req.body || {};
    const out = loyalty.earn({ tenantId: tenantOf(req), contactId, amount, orderId, reason });
    res.json({ ok: true, awarded: out.awarded, account: maskAccount(out.account), skipped: out.skipped });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Redeem quote (no mutation)
router.post('/redeem/quote', (req, res) => {
  const { points, orderTotal } = req.body || {};
  res.json({ ok: true, quote: loyalty.redemption.quote({ points, orderTotal }) });
});

// Redeem (mutates balance)
router.post('/redeem', (req, res) => {
  try {
    const { contactId, points, orderId, orderTotal } = req.body || {};
    const out = loyalty.redeem({ tenantId: tenantOf(req), contactId, points, orderId, orderTotal });
    res.json({ ok: true, redeemed: out.redeemed, value: out.value, account: maskAccount(out.account) });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Admin adjust
router.post('/adjust', (req, res) => {
  try {
    const { contactId, points, reason } = req.body || {};
    const out = loyalty.adjust({ tenantId: tenantOf(req), contactId, points, reason });
    res.json({ ok: true, account: maskAccount(out.account) });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

module.exports = router;
