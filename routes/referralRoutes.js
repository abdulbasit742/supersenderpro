'use strict';
// #74 Referral Program — HTTP routes. Mount: app.use('/api/referral', require('./routes/referralRoutes'));
const express = require('express');
const router = express.Router();
const referral = require('../lib/referral');
const { maskCode, maskReferral } = require('../lib/referral/privacy');

function tenantOf(req) { return (req.headers['x-tenant-id'] || (req.user && req.user.tenantId) || req.query.tenantId || 'default'); }

router.get('/health', (req, res) => res.json(referral.doctor.check()));

// Get/create my referral code
router.post('/code', (req, res) => {
  try {
    const { ownerId } = req.body || {};
    const c = referral.getCode(tenantOf(req), ownerId);
    res.json({ ok: true, code: c.code, uses: c.uses });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Attribute a referee to a code
router.post('/attribute', (req, res) => {
  try {
    const { code, refereeId } = req.body || {};
    const out = referral.attribute({ tenantId: tenantOf(req), code, refereeId });
    res.status(out.ok ? 200 : 400).json(Object.assign({}, out, { referral: maskReferral(out.referral) }));
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Qualify a referee (signup / first order)
router.post('/qualify', (req, res) => {
  try {
    const { refereeId, orderTotal } = req.body || {};
    const out = referral.qualify({ tenantId: tenantOf(req), refereeId, orderTotal });
    res.status(out.ok ? 200 : 400).json(Object.assign({}, out, { referral: maskReferral(out.referral) }));
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// My referral stats
router.get('/stats/:referrerId', (req, res) => {
  res.json({ ok: true, stats: referral.stats(tenantOf(req), req.params.referrerId) });
});

// List referrals (masked)
router.get('/list', (req, res) => {
  const db = referral.store.load();
  const rows = referral.store.listReferrals(db, tenantOf(req), req.query.referrerId).map(maskReferral);
  res.json({ ok: true, count: rows.length, referrals: rows });
});

module.exports = router;
