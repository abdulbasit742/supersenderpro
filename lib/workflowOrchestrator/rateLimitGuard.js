// lib/workflowOrchestrator/rateLimitGuard.js — preview-only safe delay plan. No sending.
 'use strict';
 const cfg = require('./config');

 function rateLimitGuard(input) {
     const i = input || {};
     const audience = Math.max(0, Number(i.audienceCount) || 0);
     const perMinute = Math.max(1, Number(i.perMinute) || 20);
     const batches = Math.ceil(audience / perMinute);
     return cfg.base({
       rateLimitAvailablePreview: true, liveSend: false,
     rateLimitPlanPreview: { audiencePreview: audience, perMinutePreview: perMinute, batchesPreview: batches,
 estimatedMinutesPreview: batches },
     });
 }
 module.exports = { rateLimitGuard };
