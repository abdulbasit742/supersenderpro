// lib/workflowOrchestrator/supplierAutomationPreview.js — supplier message/document request draft preview.
 'use strict';
 const cfg = require('./config');
 const { maskMessage, maskRef } = require('./redactor');
 function supplierAutomationPreview(input) {
   const i = input || {};
     return cfg.base({
       liveSend: false, liveDbMutation: false,
      supplierRefMasked: maskRef(i.supplierId || ''),
      missingDocumentPreview: i.missingDocument || 'tax_certificate_preview',
       supplierMessageDraftPreview: maskMessage(i.message || 'Meharbani farma kar pending document share karein.'),
     });
 }
 module.exports = { supplierAutomationPreview };
