 'use strict';
 /**
     * shareDraftPreview.js — drafts a share message for a document. NEVER shares,

     * uploads, or generates a public link. Recipient masked.
  */
 const redactor = require('./metadataRedactor');
 function draft(doc, recipient, note) {
   const recipientMasked = String(recipient || '').indexOf('@') > -1 ? redactor.maskEmail(recipient) :
 redactor.maskPhone(recipient);
   const messagePreview = 'Sharing document "' + doc.title + '" (' + doc.documentType + '). ' + (note ?
 String(note).slice(0, 200) : 'Please review.') + ' [internal preview, not sent, no public link]';
   return {
        ok: true, dryRun: true, liveShare: false,
        documentId: doc.id,
        recipientMasked,
        messagePreview,
        warnings: ['share_is_draft_only_no_public_link'],
        blockers: [],
      };
 }
 module.exports = { draft };
