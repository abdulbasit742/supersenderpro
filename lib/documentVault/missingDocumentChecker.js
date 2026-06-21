 'use strict';
 /**
  * missingDocumentChecker.js — given a source module + the documents present for a
     * record, reports which required document types are missing. Preview-only.
     */
 const cat = require('./documentCategoryCatalog');
 function check(sourceModule, presentTypes) {
      const required = cat.REQUIRED_BY_MODULE[sourceModule] || [];
      const present = new Set(presentTypes || []);
      const missing = required.filter((t) => !present.has(t));
      let riskLevel = 'low';
      if (missing.length && required.length) riskLevel = missing.length === required.length ? 'high' : 'medium';
      const signalMap = { contract_preview: 'missing_contract_attachment', invoice_preview: 'missing_invoice_receipt',
 receipt_preview: 'missing_invoice_receipt', tax_document_preview: 'missing_tax_evidence', payment_proof_preview:
 'missing_payment_proof', asset_warranty_preview: 'missing_asset_warranty', staff_document_preview:
 'missing_staff_document' };
   return {
        ok: true, dryRun: true, liveMutation: false,
        sourceModule: sourceModule || null,
        requiredDocumentsPreview: required,
        missingDocumentsPreview: missing.map((t) => ({ documentType: t, signal: signalMap[t] || 'missing_required_document'
 })),
        riskLevel,
        warnings: missing.length ? ['missing_required_document'] : [],
        blockers: [],
      };
 }
 module.exports = { check };
