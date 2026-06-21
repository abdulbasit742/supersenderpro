 'use strict';
 /**
  * messageDrafts.js — drafts a customer-facing message. NEVER sends. Returns
  * liveSend:false + previewOnly:true. Recipient masked.
  */
 const service = require('./customerPortalService');
 function draft(previewToken, input) {

   const c = service.getByToken(previewToken);
   const i = input || {};
   const base = { ok: true, dryRun: true, liveActionsEnabled: false, liveAction: false, previewOnly: true, liveSend:
 false, warnings: ['message_is_draft_only_not_sent'], blockers: [] };
   if (!c) return Object.assign(base, { ok: false, blockers: ['customer_not_found'] });
   const ch = ['whatsapp_preview', 'email_preview', 'sms_preview'].includes(i.channel) ? i.channel : 'whatsapp_preview';
   const text = String(i.text || '').slice(0, 800) || 'Hello, here is an update on your request.';
   return Object.assign(base, {
     previewToken: c.previewToken,
     channel: ch,
     recipientMasked: ch === 'email_preview' ? c.emailMasked : c.phoneMasked,
     messagePreview: text,
   });
 }
 module.exports = { draft };
