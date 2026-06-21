  'use strict';
  /**
   * routes/marketingJourneysRoutes.js — Email + SMS Marketing Journey Builder API.
   * Preview-only / dry-run. No live email, no live SMS, no live WhatsApp, no
   * external calls, no secrets, no full PII. Requires express.json() for PO/PUT.
   */
  const express = require('express');
  const router = express.Router();

  const service = require('../lib/marketingJourneys/journeyService');
  const segmentPreview = require('../lib/marketingJourneys/segmentPreview');
  const emailTemplates = require('../lib/marketingJourneys/emailTemplates');
  const smsTemplates = require('../lib/marketingJourneys/smsTemplates');
  const consentGuard = require('../lib/marketingJourneys/consentGuard');
  const analytics = require('../lib/marketingJourneys/campaignAnalytics');
  const previewRunner = require('../lib/marketingJourneys/journeyPreviewRunner');

  function wrap(h) { return function (req, res) { try { h(req, res); } catch (e) { res.status(500).json({ ok: false, error:
  'internal_error' }); } }; }


  router.get('/status', wrap(function (req, res) {
    res.json({
      ok: true, module: 'marketing-journeys',
      dryRun: true, liveActionsEnabled: false,
      liveEmail: false, liveSms: false, liveWhatsapp: false, externalCalls: false,
      journeys: service.list().length,
      warnings: [], blockers: [],
      timestamp: new Date().toISOString(),
    });
  }));


  router.get('/journeys', wrap(function (req, res) { res.json({ ok: true, dryRun: true, journeys: service.list() }); }));

  router.post('/journeys', wrap(function (req, res) {
    const r = service.create(req.body || {});
    return r.ok ? res.json({ ok: true, dryRun: true, journey: r.journey }) : res.status(400).json({ ok: false, errors:
  r.errors });
  }));

  router.get('/journeys/:id', wrap(function (req, res) {
    const j = service.get(req.params.id);
    return j ? res.json({ ok: true, dryRun: true, journey: j }) : res.status(404).json({ ok: false, error: 'not_found' });
  }));

router.put('/journeys/:id', wrap(function (req, res) {
 const r = service.update(req.params.id, req.body || {});
 return r.ok ? res.json({ ok: true, dryRun: true, journey: r.journey }) : res.status(r.errors.includes('not_found') ?
404 : 400).json({ ok: false, errors: r.errors });
}));

router.post('/journeys/:id/preview-run', wrap(function (req, res) {
 const j = service.get(req.params.id);
 if (!j) return res.status(404).json({ ok: false, error: 'not_found' });
 res.json(previewRunner.run(j));
}));

router.get('/segments', wrap(function (req, res) { res.json({ ok: true, dryRun: true, segments: segmentPreview.list() });
}));
router.post('/segments/preview', wrap(function (req, res) {
 const b = req.body || {};
 res.json({ ok: true, dryRun: true, preview: segmentPreview.preview(b.segmentId, b.sampleSize) });
}));


router.get('/templates/email', wrap(function (req, res) { res.json({ ok: true, dryRun: true, templates:
emailTemplates.list() }); }));
router.get('/templates/sms', wrap(function (req, res) { res.json({ ok: true, dryRun: true, templates: smsTemplates.list()
}); }));


router.post('/templates/preview', wrap(function (req, res) {
 const b = req.body || {};
 if (b.channel === 'sms') {
   const r = smsTemplates.render(b.templateId, b.vars);
   const consent = consentGuard.check('sms', b.recipientConsent);
   return res.json({ ok: true, dryRun: true, liveSend: false, channel: 'sms', recipientMasked:
segmentPreview.maskPhone('+923000000011'), messagePreview: r.messagePreview, consentOk: consent.consentOk,
optOutIncluded: r.optOutIncluded, warnings: consent.warnings, blockers: [] });
 }
 const r = emailTemplates.render(b.templateId, b.vars);
 const consent = consentGuard.check('email', b.recipientConsent);
 res.json({ ok: true, dryRun: true, liveSend: false, channel: 'email', recipientMasked:
segmentPreview.maskEmail('customer@example.com'), subjectPreview: r.subjectPreview, bodyPreview: r.bodyPreview,
consentOk: consent.consentOk, unsubscribeIncluded: r.unsubscribeIncluded, warnings: consent.warnings, blockers: [] });
}));


router.post('/consent/check', wrap(function (req, res) {
 const b = req.body || {};
 res.json(Object.assign({ ok: true, dryRun: true, channel: b.channel || 'email' }, consentGuard.check(b.channel ||
'email', b.recipientConsent)));
}));

router.get('/analytics', wrap(function (req, res) { res.json({ ok: true, dryRun: true, analytics: analytics.overview()
}); }));

module.exports = router;
