 'use strict';
 const b = require('./_base');
 const P = 'whatsappBaileysMock';
 function getStatus() { return b.status(P, ['Local WhatsApp simulated; no Baileys session used.']); }
 function validateInput(i) { return b.validate(i, ['to']); }
 function runPreview(i) {
   i = i || {};
   return b.preview(P, i.action || 'send_message', { to: i.to, body: i.body || i.template }, { messageId: 'DEMO-WAMSG-001', delivered: 'simulated', wouldSend: true }, ['No real WhatsApp message sent.']);
 }
 function getSampleScenarios() { return ['wa_order_confirmation', 'wa_payment_reminder', 'wa_support_reply']; }
 module.exports = { getStatus, runPreview, getSampleScenarios, validateInput };
