// lib/workflowOrchestrator/documentRequestAutomationPreview.js — document request draft preview.
 'use strict';
 const cfg = require('./config');
 const { maskMessage } = require('./redactor');
 function documentRequestAutomationPreview(input) {
     const i = input || {};
     return cfg.base({
       liveSend: false,
       documentTypePreview: i.documentType || 'cnic_preview',
       requestDraftPreview: maskMessage(i.message || 'Meharbani farma kar required document share karein.'),
     });
 }
 module.exports = { documentRequestAutomationPreview };
