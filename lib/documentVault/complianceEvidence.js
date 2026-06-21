 'use strict';
 /**
  * complianceEvidence.js — builds a REDACTED compliance-evidence bundle preview:
  * which required evidence exists vs missing, plus a compliance score. Never
  * exports raw files. Pure over a document list.
  */
 const cat = require('./documentCategoryCatalog');

 // Evidence checklist: category -> required document types for "audit-ready".
 const EVIDENCE_REQUIREMENTS = [
   { area: 'finance', requires: ['invoice_preview', 'receipt_preview'] },
      { area: 'tax', requires: ['tax_document_preview'] },
      { area: 'legal', requires: ['contract_preview'] },
      { area: 'supplier', requires: ['supplier_bill_preview', 'payment_proof_preview'] },
      { area: 'quality', requires: ['quality_evidence_preview', 'product_certificate_preview'] },
      { area: 'backup', requires: ['backup_manifest_preview'] },
      { area: 'audit', requires: ['audit_evidence_preview'] },
 ];

 function build(documents) {
   const present = new Set((documents || []).map((d) => d.documentType));
      const evidenceItems = [];
      const missing = [];
      EVIDENCE_REQUIREMENTS.forEach((req) => {
        req.requires.forEach((t) => {
           if (present.has(t)) evidenceItems.push({ area: req.area, documentType: t, status: 'present_preview' });
           else missing.push({ area: req.area, documentType: t, status: 'missing' });
        });
      });
      const totalRequired = evidenceItems.length + missing.length;
      const complianceScorePreview = totalRequired ? Math.round((evidenceItems.length / totalRequired) * 100) : 100;
      return {
        ok: true, dryRun: true, liveExport: false, redactedOnly: true,
        evidenceItemsPreview: evidenceItems,
        missingEvidencePreview: missing,
        complianceScorePreview,
        warnings: missing.length ? ['missing_required_document'] : [],
        blockers: [],
      };

 }
 module.exports = { build, EVIDENCE_REQUIREMENTS };
