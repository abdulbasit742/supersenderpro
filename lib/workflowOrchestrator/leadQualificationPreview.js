// lib/workflowOrchestrator/leadQualificationPreview.js — lead score heuristic preview. No CRM mutation.
 'use strict';
 const cfg = require('./config');
 function leadQualificationPreview(input) {
   const i = input || {};
     let score = 0;
     if (i.repliedFast) score += 25;
     if (i.hasBudget) score += 30;
     if (i.askedPrice) score += 20;
     if (i.repeatVisitor) score += 15;
     if (i.optedIn) score += 10;
     score = Math.min(100, score);
     const q = score >= 70 ? 'hot_preview' : score >= 40 ? 'warm_preview' : 'cold_preview';
     return cfg.base({
       liveCrmMutation: false, leadScorePreview: score, qualificationPreview: q,
     recommendedNextStepPreview: q === 'hot_preview' ? 'assign_agent_preview' : (q === 'warm_preview' ?
 'draft_campaign_followup_preview' : 'draft_template_message_preview'),
     });
 }
 module.exports = { leadQualificationPreview };
