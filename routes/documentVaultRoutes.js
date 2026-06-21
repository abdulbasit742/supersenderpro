  'use strict';
  /**
   * routes/documentVaultRoutes.js — Document Vault + File Attachment + Compliance
   * Evidence API. Preview-only / dry-run. No external storage (Drive/S3/Dropbox),
   * no raw private export, no public sharing, no real e-signature, no OCR, no
   * external calls, no secrets, metadata redacted. express.json() for POST/PUT.
   */
  const express = require('express');
  const router = express.Router();


  const service = require('../lib/documentVault/documentService');
  const cat = require('../lib/documentVault/documentCategoryCatalog');
  const moduleLinker = require('../lib/documentVault/moduleLinker');
  const expiryTracker = require('../lib/documentVault/expiryTracker');
  const missingDocumentChecker = require('../lib/documentVault/missingDocumentChecker');
  const complianceEvidence = require('../lib/documentVault/complianceEvidence');
  const accessGuardPreview = require('../lib/documentVault/accessGuardPreview');
  const shareDraftPreview = require('../lib/documentVault/shareDraftPreview');
  const auditTrailPreview = require('../lib/documentVault/auditTrailPreview');


  function wrap(h) { return function (req, res) { try { h(req, res); } catch (e) { res.status(500).json({ ok: false, error:
  'internal_error' }); } }; }
  function docOr404(id, res) { const d = service.get(id); if (!d) res.status(404).json({ ok: false, error: 'not_found' });
  return d; }

  router.get('/status', wrap(function (req, res) {
    service.ensureSeeded();
    res.json({ ok: true, module: 'document-vault', dryRun: true, liveActionsEnabled: false, externalStorage: false,
  rawExport: false, publicSharing: false, eSignature: false, metadataRedacted: true, documents: service.list().length,
  warnings: [], blockers: [], timestamp: new Date().toISOString() });
  }));

  router.get('/documents', wrap(function (req, res) { res.json({ ok: true, dryRun: true, documents: service.list(req.query)
  }); }));
  router.post('/documents', wrap(function (req, res) { res.json(service.create(req.body || {})); }));
  router.get('/documents/:id', wrap(function (req, res) { const d = docOr404(req.params.id, res); if (d) res.json({ ok:
  true, dryRun: true, document: d }); }));
  router.put('/documents/:id', wrap(function (req, res) { const r = service.update(req.params.id, req.body || {}); return
  r.ok ? res.json(r) : res.status(404).json({ ok: false, errors: r.errors }); }));

  router.post('/documents/:id/link-preview', wrap(function (req, res) { const d = docOr404(req.params.id, res); if (!d)
  return; const b = req.body || {}; res.json(moduleLinker.linkPreview(d, b.sourceModule, b.linkedRecordId,

b.linkedRecordLabel)); }));
router.post('/documents/:id/verify-preview', wrap(function (req, res) { const r = service.verifyPreview(req.params.id);
return r.ok ? res.json(r) : res.status(404).json(r); }));
router.post('/documents/:id/share-draft-preview', wrap(function (req, res) { const d = docOr404(req.params.id, res); if
(!d) return; const b = req.body || {}; res.json(shareDraftPreview.draft(d, b.recipient, b.note)); }));

router.get('/categories', wrap(function (req, res) { res.json({ ok: true, dryRun: true, documentTypes:
cat.DOCUMENT_TYPES, categories: cat.CATEGORIES, statuses: cat.STATUSES }); }));
router.get('/module-links', wrap(function (req, res) { res.json({ ok: true, dryRun: true, modules:
cat.LINKED_MODULES.map((m) => ({ module: m, detected: moduleLinker.moduleAvailable(m), requiredDocs:
cat.REQUIRED_BY_MODULE[m] || [] })) }); }));

router.post('/missing-check-preview', wrap(function (req, res) {
 const b = req.body || {};
 const sourceModule = b.sourceModule;
 // derive present types from vault if not supplied
 const present = b.presentTypes || service.list({ sourceModule }).map((d) => d.documentType);
 res.json(missingDocumentChecker.check(sourceModule, present));
}));


router.get('/expiry-alerts', wrap(function (req, res) { res.json(expiryTracker.alerts(service.list(),
req.query.withinDays)); }));


router.get('/compliance-evidence', wrap(function (req, res) { res.json(complianceEvidence.build(service.list())); }));
router.post('/compliance-evidence-preview', wrap(function (req, res) { const b = req.body || {}; const docs = b.documents
|| service.list(b.filter || {}); res.json(complianceEvidence.build(docs)); }));


router.post('/access-check-preview', wrap(function (req, res) { const b = req.body || {}; const d =
service.get(b.documentId); if (!d) return res.status(404).json({ ok: false, error: 'not_found' });
res.json(accessGuardPreview.check(d, b.role)); }));

router.get('/audit-trail-preview', wrap(function (req, res) { res.json(auditTrailPreview.preview(req.query.limit)); }));


router.get('/summary', wrap(function (req, res) {
 const docs = service.list();
 const exp = expiryTracker.alerts(docs);
 const ev = complianceEvidence.build(docs);
 res.json({
   ok: true, dryRun: true, liveActionsEnabled: false,
   totalDocumentsPreview: docs.length,
   verifiedDocumentsPreview: docs.filter((d) => d.status === 'verified_preview').length,
   missingRequiredPreview: ev.missingEvidencePreview.length,
   expiringSoonPreview: exp.expiringSoonPreview.length,
   expiredPreview: exp.expiredPreview.length,
   highRiskDocumentsPreview: docs.filter((d) => ['high', 'critical'].includes(d.riskLevel)).length,
   complianceScorePreview: ev.complianceScorePreview,
   warnings: [], blockers: [],
 });
}));

module.exports = router;
