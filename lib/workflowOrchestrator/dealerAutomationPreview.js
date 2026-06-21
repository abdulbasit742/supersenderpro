// lib/workflowOrchestrator/dealerAutomationPreview.js — dealer/reseller message draft preview.
 'use strict';
 const cfg = require('./config');
 const { maskMessage, maskRef } = require('./redactor');
 function dealerAutomationPreview(input) {
     const i = input || {};
     return cfg.base({
      liveSend: false, liveDbMutation: false,
      dealerRefMasked: maskRef(i.dealerId || ''), tierPreview: i.tier || 'standard_preview',
       dealerMessageDraftPreview: maskMessage(i.message || 'Aap ke bulk order par special pricing available hai.'),
     });
 }
 module.exports = { dealerAutomationPreview };
