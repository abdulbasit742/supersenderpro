 'use strict';
 /**
  * scripts/document-vault-check.js — loads the vault layer, confirms safe defaults,
  * exercises expiry + missing + evidence + access on seeds, writes a report to
  * artifacts/. Read-only on source; only writes under artifacts/. No network, no
  * external storage, no raw export, no secrets printed.
  */
 const fs = require('fs');
 const path = require('path');
 const ROOT = process.cwd();
 const R = (p) => require(path.join(ROOT, p));

 function main() {
   const model = R('lib/documentVault/documentModel.js');
   const expiryTracker = R('lib/documentVault/expiryTracker.js');
   const missingDocumentChecker = R('lib/documentVault/missingDocumentChecker.js');
   const complianceEvidence = R('lib/documentVault/complianceEvidence.js');
   const accessGuardPreview = R('lib/documentVault/accessGuardPreview.js');
   const shareDraftPreview = R('lib/documentVault/shareDraftPreview.js');
   R('routes/documentVaultRoutes.js');

   const docs = model.seeds();
   const blockers = [];
   const warnings = [];

   // seeds include an expired GST return -> expiry tracker must catch it
   const exp = expiryTracker.alerts(docs);
   if (exp.expiredPreview.length < 1) blockers.push('expired_not_detected');

   // payables requires bill + payment_proof; give only payment_proof -> missing bill
   const miss = missingDocumentChecker.check('payables_center', ['payment_proof_preview']);
   if (miss.missingDocumentsPreview.length < 1) blockers.push('missing_not_detected');

   const ev = complianceEvidence.build(docs);
   if (typeof ev.complianceScorePreview !== 'number') blockers.push('bad_compliance_score');
   if (ev.liveExport !== false || ev.redactedOnly !== true) blockers.push('evidence_not_safe');

   // viewer must be denied a finance doc
   const finDoc = model.newDocument({ documentType: 'invoice_preview' });
   const acc = accessGuardPreview.check(finDoc, 'viewer');

   if (acc.allowedPreview !== false) blockers.push('viewer_allowed_finance');
   if (acc.livePermissionChange !== false) blockers.push('permission_change_not_blocked');

   // share must be draft-only, recipient masked
   const share = shareDraftPreview.draft(docs[0], 'someone@example.com');
   if (share.liveShare !== false) blockers.push('share_not_draft');
   if (/someone@example\.com/.test(JSON.stringify(share))) blockers.push('recipient_not_masked');

   const result = {
     generatedAt: new Date().toISOString(),
     dryRun: true, liveActionsEnabled: false, externalStorage: false, rawExport: false, publicSharing: false,
     module: 'document-vault',
     seedDocuments: docs.length,
     complianceScorePreview: ev.complianceScorePreview,
     warnings, blockers,
     pass: blockers.length === 0,
   };

   const ARTIFACTS = path.join(ROOT, 'artifacts');
   if (!fs.existsSync(ARTIFACTS)) fs.mkdirSync(ARTIFACTS, { recursive: true });
   fs.writeFileSync(path.join(ARTIFACTS, 'document_vault_check.json'), JSON.stringify(result, null, 2));

   console.log('[document-vault:check] docs=%d compliance=%d%% blockers=%d pass=%s', result.seedDocuments,
 result.complianceScorePreview, result.blockers.length, result.pass);
   process.exit(result.pass ? 0 : 1);
 }
 main();
