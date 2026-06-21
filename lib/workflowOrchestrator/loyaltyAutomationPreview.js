// lib/workflowOrchestrator/loyaltyAutomationPreview.js — loyalty/reward reminder draft preview.
 'use strict';
 const cfg = require('./config');
 const { maskMessage } = require('./redactor');
 function loyaltyAutomationPreview(input) {

     const i = input || {};
     const points = Math.max(0, Number(i.points) || 0);
     return cfg.base({
       liveRewardMutation: false, liveSend: false,
       pointsPreview: points, tierPreview: points >= 500 ? 'gold_preview' : points >= 100 ? 'silver_preview' :
 'bronze_preview',
     rewardDraftPreview: maskMessage(i.message || ('Aap ke ' + points + ' points hain, reward redeem karein!')),
     });
 }
 module.exports = { loyaltyAutomationPreview };
