// lib/workflowOrchestrator/whatsappWindowGuard.js — preview-only 24h session window check.
 'use strict';
 const cfg = require('./config');
 function whatsappWindowGuard(input) {
   const i = input || {};
     const last = Number(i.lastInboundMsAgo); // ms since last inbound customer message
     const inside = Number.isFinite(last) ? last <= 24 * 60 * 60 * 1000 : false;
     return cfg.base({
       inside24hWindowPreview: inside,
       templateRequiredPreview: !inside,
       reasonPreview: inside ? 'free_form_allowed_preview' : 'template_required_outside_window_preview',
     });
 }
 module.exports = { whatsappWindowGuard };
