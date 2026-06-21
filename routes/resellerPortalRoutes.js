 'use strict';
 /**
  * routes/resellerPortalRoutes.js
  * Express Router for the White Label + Reseller Partner Portal.
  * No real payouts, no live tenant creation, no live messaging, no full PII/secrets in responses.
  * Public endpoints redacted. Does not crash if data files are missing.
  */
 const express = require('express');
 const router = express.Router();

 const resellers = require('../lib/resellerPortal/resellerRegistry');
 const whiteLabel = require('../lib/resellerPortal/whiteLabelSettings');
 const referrals = require('../lib/resellerPortal/referralTracker');
 const clientPreview = require('../lib/resellerPortal/clientPreview');
 const commission = require('../lib/resellerPortal/commissionPreview');
 const commissionReport = require('../lib/resellerPortal/commissionReport');
 const assets = require('../lib/resellerPortal/assetLibrary');
 const adapters = require('../lib/resellerPortal/adapters');
 const safety = require('../lib/resellerPortal/safetyGuard');
 const store = require('../lib/resellerPortal/store');

 const ok = (res, data) => res.json(Object.assign({ ok: true }, data));
 const bad = (res, code, errors) => res.status(code).json({ ok: false, errors });

 router.get('/status', (req, res) => {
   const r = resellers.list();
   ok(res, {
       enabled: String(process.env.RESELLER_PORTAL_ENABLED || 'true') === 'true',
       dryRun: safety.globalDryRun(), whiteLabel: safety.allowWhiteLabel(), customDomain: safety.allowCustomDomain(),
       realPayouts: safety.allowRealPayouts(), liveMessages: safety.allowLiveMessages(),
       counts: { resellers: r.length, active: r.filter((x) => x.status === 'active').length, referrals:
 store.loadReferrals().length },
   });
 });

 // resellers
 router.get('/resellers', (req, res) => ok(res, { resellers: resellers.list() }));
 router.post('/resellers', (req, res) => { const r = resellers.create(req.body || {}); return r.ok ? ok(res, { reseller:
 r.reseller }) : bad(res, 400, r.errors); });
 router.get('/resellers/:id', (req, res) => { const r = resellers.get(req.params.id); return r ? ok(res, { reseller: r })
 : bad(res, 404, ['not_found']); });
 router.put('/resellers/:id', (req, res) => { const r = resellers.update(req.params.id, req.body || {}); return r.ok ?
 ok(res, { reseller: r.reseller }) : bad(res, 400, r.errors); });

 // white label
 router.get('/resellers/:id/branding', (req, res) => ok(res, { branding: whiteLabel.get(req.params.id) }));
 router.put('/resellers/:id/branding', (req, res) => { const r = whiteLabel.update(req.params.id, req.body || {}); return
 r.ok ? ok(res, { branding: r.settings }) : bad(res, 400, r.errors); });
 router.post('/resellers/:id/branding/preview', (req, res) => ok(res, whiteLabel.preview(req.params.id, req.body || {})));

// referrals
router.get('/resellers/:id/referrals', (req, res) => ok(res, { referrals: referrals.list(req.params.id) }));
router.post('/resellers/:id/referrals', (req, res) => { const r = referrals.create(req.params.id, req.body || {}); return
r.ok ? ok(res, { referral: r.referral }) : bad(res, 400, r.errors); });
router.post('/referral-link/preview', (req, res) => ok(res, { link: referrals.linkPreview(req.body || {}) }));


// clients
router.get('/resellers/:id/clients', (req, res) => { const r = clientPreview.list(req.params.id); return r.ok ? ok(res, {
clients: r.clients, note: r.note }) : bad(res, 404, r.errors); });
router.get('/resellers/:id/clients/:clientId', (req, res) => { const r = clientPreview.get(req.params.id,
req.params.clientId); return r.ok ? ok(res, { client: r.client }) : bad(res, 404, r.errors); });

// commissions
router.get('/resellers/:id/commissions', (req, res) => ok(res, { commission: commission.preview(req.params.id,
req.query.period) }));
router.post('/resellers/:id/commissions/preview', (req, res) => ok(res, { commission: commission.preview(req.params.id,
(req.body && req.body.period)) }));


// assets
router.get('/assets', (req, res) => ok(res, { assetTypes: assets.list() }));
router.post('/assets/generate-draft', (req, res) => ok(res, { asset: assets.generate((req.body && req.body.type) ||
'sales_pitch', (req.body && req.body.language)) }));


// reports
router.get('/dashboard', (req, res) => ok(res, { support: adapters.supportHelpdesk.summary(), pilot:
adapters.pilotOps.summary(), commission: commissionReport.generate() }));
router.get('/history', (req, res) => ok(res, { history: store.readHistory(Number(req.query.limit) || 200) }));
router.get('/doctor', (req, res) => ok(res, { dryRun: safety.globalDryRun(), realPayouts: safety.allowRealPayouts(),
whiteLabel: safety.allowWhiteLabel(), customDomain: safety.allowCustomDomain(), forbidden: safety.FORBIDDEN, nextSteps:
['Keep payouts + white-label off until reviewed', 'Bind portal access to admin RBAC'] }));
router.post('/report/generate', (req, res) => ok(res, { report: commissionReport.generate((req.body && req.body.period))
}));


// public partner inquiry -> safe lead preview only (consent required, no live send)
router.post('/public/partner-inquiry', (req, res) => {
  const b = req.body || {};
  if (safety.requireConsent() && b.consent !== true) return bad(res, 400, ['consent_required']);
  store.appendHistory({ kind: 'partner_inquiry', tier: b.partnerTier || 'referral_partner' });
  ok(res, { received: true, dryRun: true, note: 'Partner inquiry logged as a safe lead preview. No email/WhatsApp sent.'
});
});


module.exports = router;
