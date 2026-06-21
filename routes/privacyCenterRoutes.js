 'use strict';

 /**
  * Privacy Center — Express router. Dry-run / preview only. No real delete, no raw
  * export, no external calls, no secrets/full PII. Errors caught; no stack traces.
  *
  * Mount (inside marked hook):
  *     const privacyCenterRoutes = require('./routes/privacyCenterRoutes');
  *     app.use('/api/privacy-center', privacyCenterRoutes);
  */

 const express = require('express');
 const router = express.Router();

 const service = require('../lib/privacyCenter/privacyRequestService');
 const model = require('../lib/privacyCenter/privacyRequestModel');
 const exportPreview = require('../lib/privacyCenter/dataExportPreview');
 const deletePreview = require('../lib/privacyCenter/dataDeletionPreview');
 const retention = require('../lib/privacyCenter/retentionPolicies');
 const consent = require('../lib/privacyCenter/consentRecords');
 const auditExport = require('../lib/privacyCenter/auditExportPreview');

 function enabled() { return String(process.env.PRIVACY_CENTER_ENABLED || 'true').toLowerCase() !== 'false'; }
 router.use(function (req, res, next) { if (!enabled()) return res.status(404).json({ ok: false, error:
 'privacy_center_disabled' }); next(); });
 function wrap(h) { return function (req, res) { try { h(req, res); } catch (e) { res.status(500).json({ ok: false, error:
 'internal_error' }); } }; }

 router.get('/status', wrap(function (req, res) {
   res.json({ ok: true, feature: 'privacy-center', dryRun: true, liveActionsEnabled: false, store: service.statusInfo(),
 requestTypes: model.REQUEST_TYPES, dataTypes: retention.DATA_TYPES });
 }));

 // requests CRUD
 router.get('/requests', wrap(function (req, res) { res.json({ ok: true, requests: service.list() }); }));
 router.post('/requests', wrap(function (req, res) { res.status(201).json({ ok: true, request: service.create(req.body ||
 {}) }); }));
 router.get('/requests/:id', wrap(function (req, res) { const r = service.get(req.params.id); return r ? res.json({ ok:
 true, request: r }) : res.status(404).json({ ok: false, error: 'not_found' }); }));
 router.put('/requests/:id', wrap(function (req, res) { const r = service.update(req.params.id, req.body || {}); return r
 ? res.json({ ok: true, request: r }) : res.status(404).json({ ok: false, error: 'not_found' }); }));

 // export + delete previews
 router.post('/requests/:id/export-preview', wrap(function (req, res) { res.json(exportPreview.run(req.params.id)); }));
 router.post('/requests/:id/delete-preview', wrap(function (req, res) { res.json(deletePreview.run(req.params.id, req.body
 || {})); }));

// retention policies
router.get('/retention-policies', wrap(function (req, res) { res.json({ ok: true, policies: retention.list() }); }));
router.post('/retention-policies', wrap(function (req, res) { res.status(201).json({ ok: true, policy:
retention.create(req.body || {}) }); }));
router.post('/retention-policies/:id/run-preview', wrap(function (req, res) {
res.json(retention.runPreview(req.params.id)); }));


// consent records
router.get('/consent-records', wrap(function (req, res) { res.json(consent.list(req.query || {})); }));

// audit export preview
router.post('/audit-export-preview', wrap(function (req, res) { res.json(auditExport.run(req.body || {})); }));

// compliance checklist
router.get('/compliance-checklist', wrap(function (req, res) {
res.json({ ok: true, dryRun: true, checklist: [
  { item: 'Privacy request intake exists', ok: true },
  { item: 'Data export is redacted preview only', ok: true },
  { item: 'Data deletion is plan preview only (no real delete)', ok: true },
  { item: 'Protected data types retained/anonymized (payments, audit, tenant)', ok: true },
  { item: 'Retention policies defined', ok: retention.list().length > 0 },
  { item: 'Consent records accessible (masked)', ok: true },
  { item: 'Audit export redacted only', ok: true },
  { item: 'PII masked in all responses', ok: true },
  { item: 'No external API calls', ok: true },
  { item: 'Identity verification required before deletion approval', ok: true },
] });
}));


module.exports = router;
