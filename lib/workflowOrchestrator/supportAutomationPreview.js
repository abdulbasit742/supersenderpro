// lib/workflowOrchestrator/supportAutomationPreview.js — support reply draft preview + AI intent.
 'use strict';
 const cfg = require('./config');
 const { aiDecisionPreview } = require('./aiDecisionPreview');
 const { maskMessage } = require('./redactor');
 function supportAutomationPreview(input) {
   const i = input || {};
     const ai = aiDecisionPreview({ message: i.message });
     return cfg.base({
       liveTicketCreation: false, liveSend: false,
       intentPreview: ai.intentPreview, confidencePreview: ai.confidencePreview,
       supportResponseDraftPreview: maskMessage(i.message ? ('Re: ' + i.message) : 'Support draft preview'),
       handoffSuggestedPreview: ai.recommendedActionPreview === 'create_handoff_ticket_preview',
     });
 }
 module.exports = { supportAutomationPreview };
