 'use strict';
 /**
  * messageDrafts.js — drafts a supplier-facing message. NEVER sends. liveSend:false
  * + previewOnly:true. Recipient masked.
  */
 const service = require('./supplierPortalService');
 function draft(previewToken, input) {
   const s = service.getByToken(previewToken);
   const i = input || {};
   const base = { ok: true, dryRun: true, liveActionsEnabled: false, liveAction: false, previewOnly: true, liveSend:
 false, warnings: ['message_is_draft_only_not_sent'], blockers: [] };

      if (!s) return Object.assign(base, { ok: false, blockers: ['supplier_not_found'] });
      const ch = ['whatsapp_preview', 'email_preview', 'sms_preview'].includes(i.channel) ? i.channel : 'whatsapp_preview';
      return Object.assign(base, {
        previewToken: s.previewToken,
        channel: ch,
        recipientMasked: ch === 'email_preview' ? s.emailMasked : s.phoneMasked,
        messagePreview: String(i.text || '').slice(0, 800) || 'Hello, here is an update regarding your account.',
      });
 }
 module.exports = { draft };
