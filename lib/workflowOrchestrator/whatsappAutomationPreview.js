// lib/workflowOrchestrator/whatsappAutomationPreview.js — WhatsApp reply draft preview. liveSend always false.
 'use strict';
 const cfg = require('./config');
 const { maskPhone, maskMessage } = require('./redactor');
 const { whatsappWindowGuard } = require('./whatsappWindowGuard');


 function whatsappAutomationPreview(input) {
   const i = input || {};
     const win = whatsappWindowGuard({ lastInboundMsAgo: i.lastInboundMsAgo });
     const draft = i.message || 'Assalam o Alaikum! Aap ka message mil gaya, hum jald reply karenge.';
     return cfg.base({
       liveSend: false, metaApiCall: false,
       phoneMasked: maskPhone(i.phone || ''),
       messageDraftPreview: maskMessage(draft),
       templateRequiredPreview: win.templateRequiredPreview,
       inside24hWindowPreview: win.inside24hWindowPreview,
     });
 }
 module.exports = { whatsappAutomationPreview };
