// lib/workflowOrchestrator/aiDecisionPreview.js — deterministic heuristic. NEVER calls a live AI provider.
 'use strict';
 const cfg = require('./config');
 const { maskMessage } = require('./redactor');

 const HANDOFF_KEYWORDS = /agent|human|complaint|refund|angry|legal|manager/i;
 const ORDER_KEYWORDS = /order|buy|price|stock|delivery|kitna|kahan/i;


 function aiDecisionPreview(input) {
   const i = input || {};
     const msg = String(i.message || '');

     let intent = 'general_inquiry_preview'; let confidence = 0.55; let action = 'draft_ai_reply_preview';
   if (HANDOFF_KEYWORDS.test(msg)) { intent = 'needs_human_preview'; confidence = 0.82; action =
 'create_handoff_ticket_preview'; }
   else if (ORDER_KEYWORDS.test(msg)) { intent = 'purchase_intent_preview'; confidence = 0.74; action =
 'draft_whatsapp_reply_preview'; }
     else if (!msg.trim()) { intent = 'unknown_preview'; confidence = 0.2; action = 'create_handoff_ticket_preview'; }
     return cfg.base({
       liveAiCall: false, externalCallsEnabled: false,
       intentPreview: intent, confidencePreview: Number(confidence.toFixed(2)),
       recommendedActionPreview: action,
       reasonPreview: 'heuristic_preview (no live model called)',
       inputPreview: maskMessage(msg),
     });
 }
 module.exports = { aiDecisionPreview };
