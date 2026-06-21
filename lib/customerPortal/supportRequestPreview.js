 'use strict';
 /**
  * supportRequestPreview.js — previews a customer support request. NEVER creates a
  * live ticket. Returns liveTicketCreation:false + previewOnly:true. Masks contact.
  */
 const service = require('./customerPortalService');
 const redactor = require('./redactor');

 function preview(previewToken, input) {
   const c = service.getByToken(previewToken);
   const i = input || {};
   const base = { ok: true, dryRun: true, liveActionsEnabled: false, liveAction: false, previewOnly: true,
 liveTicketCreation: false, warnings: [], blockers: [] };
   if (!c) return Object.assign(base, { ok: false, blockers: ['customer_not_found'] });
   const subject = String(i.subject || '').slice(0, 120) || '(no subject)';
   const body = String(i.body || '').slice(0, 1000);
   return Object.assign(base, {
     previewToken: c.previewToken,
     requestPreview: {
       fromMasked: { displayNameSafe: c.displayNameSafe, phoneMasked: c.phoneMasked, emailMasked: c.emailMasked },
       subjectPreview: subject,
       bodyPreview: body,
       categoryPreview: i.category || 'general',
       wouldRouteTo: 'helpdesk_preview',
     },
     note: 'Support request preview only; no ticket created. Wire to Helpdesk behind admin auth to go live.',
   });
 }
 module.exports = { preview };
