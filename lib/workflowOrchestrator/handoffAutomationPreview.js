// lib/workflowOrchestrator/handoffAutomationPreview.js — human handoff preview. No ticket creation.
 'use strict';
 const cfg = require('./config');
 const { aiDecisionPreview } = require('./aiDecisionPreview');
 function handoffAutomationPreview(input) {
     const i = input || {};
     const ai = aiDecisionPreview({ message: i.message });
     const required = ai.recommendedActionPreview === 'create_handoff_ticket_preview' || Number(i.confidence) < 0.5;
     return cfg.base({
       liveTicketCreation: false, handoffRequiredPreview: required,
       assignedAgentPreview: required ? 'agent_preview' : 'none_preview',
       reasonPreview: required ? 'low_confidence_or_sensitive_preview' : 'auto_reply_ok_preview',
     });
 }
 module.exports = { handoffAutomationPreview };
