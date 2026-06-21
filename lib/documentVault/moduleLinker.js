 'use strict';
 /**
  * moduleLinker.js — previews linking a document to a source-module record.
     * Bridges read-only to the target module if present (existence check only),
     * never writes. Returns a masked link preview.
  */
 const cat = require('./documentCategoryCatalog');
 const redactor = require('./metadataRedactor');


 function moduleAvailable(sourceModule) {
   const map = {
     contract_center: '../contractCenter', receivables_center: '../receivablesCenter', payables_center:
 '../payablesCenter',
        accounting_center: '../accountingCenter', cashbook_center: '../cashbookCenter', tax_compliance: '../taxCompliance',
        supplier_planner: '../supplierPlanner', quality_center: '../qualityCenter', backup_center: '../backupRestore',
      };
      const p = map[sourceModule];
      if (!p) return false;
      try { require(p); return true; } catch (e) { return false; }
 }


 function linkPreview(doc, sourceModule, recordId, recordLabel) {
   const valid = cat.LINKED_MODULES.includes(sourceModule);
      const warnings = [];
      if (!valid) warnings.push('unknown_source_module');
      if (!recordId) warnings.push('missing_linked_record_id');
      if (valid && !moduleAvailable(sourceModule)) warnings.push('target_module_not_detected_preview_only');
      return {
        ok: true, dryRun: true, liveLink: false,
        documentId: doc.id,
        sourceModule: valid ? sourceModule : null,
        linkedRecordIdPreview: recordId || null,
        linkedRecordLabelSafe: recordLabel ? redactor.maskRef(recordLabel) : null,
        warnings, blockers: [],
      };
 }
 module.exports = { linkPreview, moduleAvailable };
