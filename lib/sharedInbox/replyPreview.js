'use strict';
/**
 * lib/sharedInbox/replyPreview.js
    * Builds a WhatsApp-safe reply PREVIEW. Never sends. Masks recipient. Dry-run always.
    */
const store = require('./store');
function liveSendAllowed() { return false; } // shared inbox never sends live; that's the sender module's job
function build(params) {
  const p = params || {};
     const text = String(p.text || '').slice(0, 4096);
     const warnings = [];
     if (!text.trim()) warnings.push('empty_message');
     if (text.length >= 4096) warnings.push('message_truncated_to_4096');
     // crude WhatsApp template safety hint: very long or link-heavy messages
     if ((text.match(/https?:\/\//g) || []).length > 3) warnings.push('many_links_may_reduce_deliverability');
     return {
       ok: true, dryRun: true, liveSend: false,
       channel: p.channel || 'whatsapp',
       recipientMasked: store.maskPhone(p.to || p.recipient || ''),
       messagePreview: store.maskEmail(store.maskPhone(text)),
       warnings,
       blockers: liveSendAllowed() ? [] : ['live_send_disabled_in_shared_inbox'],
     };
}
module.exports = { build, liveSendAllowed };
