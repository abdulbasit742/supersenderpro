  'use strict';

  /**
   * Reseller Portal QA — Express router. Read-only / dry-run. No payouts, no live
   * messages, no DNS/SSL, no tenant writes, no secrets/full PII in responses.
   *
   * Mount (inside marked hook):
   *     const resellerPortalQARoutes = require('./routes/resellerPortalQARoutes');
   *     app.use('/api/reseller-portal-qa', resellerPortalQARoutes);
   */

  const express = require('express');
  const router = express.Router();

  const guard = require('../lib/resellerPortal/qa/qaGuard');
  const onboardingDoctor = require('../lib/resellerPortal/qa/onboardingDoctor');
  const checklist = require('../lib/resellerPortal/qa/partnerOnboardingChecklist');
  const brandingQA = require('../lib/resellerPortal/qa/brandingQA');
  const referralQA = require('../lib/resellerPortal/qa/referralQA');
  const commissionQA = require('../lib/resellerPortal/qa/commissionQA');
  const tenantPrivacyQA = require('../lib/resellerPortal/qa/tenantPrivacyQA');
  const publicPartnerPageQA = require('../lib/resellerPortal/qa/publicPartnerPageQA');
  const assetQA = require('../lib/resellerPortal/qa/assetQA');
  const doctor = require('../lib/resellerPortal/qa/resellerReadinessDoctor');

  router.use(function (req, res, next) { if (!guard.enabled()) return res.status(404).json({ ok: false, error:
  'reseller_portal_qa_disabled' }); next(); });
  function wrap(h) { return function (req, res) { try { h(req, res); } catch (e) { res.status(500).json({ ok: false, error:
  'internal_error' }); } }; }
  function sampleId(req) { return (req.query && req.query.resellerId) || (req.body && req.body.resellerId) || 'qa_sample';
  }

  router.get('/status', wrap(function (req, res) {
    res.json({ ok: true, feature: 'reseller-portal-qa', enabled: guard.enabled(), dryRun: guard.dryRun(), strict:
  guard.strict(), policy: { requirePrivacy: guard.requirePrivacy(), requirePayoutDisabled: guard.requirePayoutDisabled(),
  requireLiveMessagesDisabled: guard.requireLiveMessagesDisabled(), requireConsent: guard.requireConsent() } });
  }));


  // onboarding
  router.get('/onboarding', wrap(function (req, res) { res.json({ ok: true, checklist: checklist.build() }); }));
  router.post('/onboarding/run', wrap(function (req, res) { res.json(Object.assign({ ok: true }, onboardingDoctor.run()));
  }));

  // branding
  router.get('/branding', wrap(function (req, res) { res.json(Object.assign({ ok: true }, brandingQA.run(sampleId(req))));
  }));
  router.post('/branding/run', wrap(function (req, res) { res.json(Object.assign({ ok: true },

brandingQA.run(sampleId(req)))); }));

// referrals
router.get('/referrals', wrap(function (req, res) { res.json(Object.assign({ ok: true }, referralQA.run(sampleId(req))));
}));
router.post('/referrals/run', wrap(function (req, res) { res.json(Object.assign({ ok: true },
referralQA.run(sampleId(req)))); }));

// commissions
router.get('/commissions', wrap(function (req, res) { res.json(Object.assign({ ok: true },
commissionQA.run(sampleId(req)))); }));
router.post('/commissions/run', wrap(function (req, res) { res.json(Object.assign({ ok: true },
commissionQA.run(sampleId(req)))); }));

// privacy
router.get('/privacy', wrap(function (req, res) { res.json(Object.assign({ ok: true },
tenantPrivacyQA.run(sampleId(req)))); }));
router.post('/privacy/run', wrap(function (req, res) { res.json(Object.assign({ ok: true },
tenantPrivacyQA.run(sampleId(req)))); }));


// public page
router.get('/public-page', wrap(function (req, res) { res.json(Object.assign({ ok: true }, publicPartnerPageQA.run()));
}));
router.post('/public-page/run', wrap(function (req, res) { res.json(Object.assign({ ok: true },
publicPartnerPageQA.run())); }));


// assets
router.get('/assets', wrap(function (req, res) { res.json(Object.assign({ ok: true }, assetQA.run())); }));
router.post('/assets/run', wrap(function (req, res) { res.json(Object.assign({ ok: true }, assetQA.run())); }));


// doctor
router.get('/doctor', wrap(function (req, res) { res.json(Object.assign({ ok: true }, doctor.run())); }));
router.post('/doctor/run', wrap(function (req, res) { res.json(Object.assign({ ok: true }, doctor.run())); }));


// report
router.get('/report', wrap(function (req, res) { const d = doctor.run(); res.json({ ok: true, score: d.score, status:
d.status, blockers: d.blockers, warnings: d.warnings }); }));
router.post('/report/generate', wrap(function (req, res) { res.json(Object.assign({ ok: true, dryRun: true },
doctor.run())); }));


module.exports = router;
