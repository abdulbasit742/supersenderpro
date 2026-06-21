// lib/vendorPortal/messageDrafts.js — Safe vendor message draft previews. Never sends (WhatsApp/email/SMS).
'use strict';
const store = require('./store');
const { safeResponse } = require('./vendorPortalModel');
const { maskPhone, safeText } = require('./redactor');

function recipientMasked(input) {
  const { vendor } = store.findVendorPreview(input);
  return maskPhone(input.recipient || (vendor && vendor.phone) || '');
}

function createMessageDraftPreview(input = {}) {
  return safeResponse({
    liveSend: false,
    channel: `${safeText(input.channel || 'whatsapp')}_preview`,
    recipientMasked: recipientMasked(input),
    messagePreview: safeText(input.message || 'Hello, this is a safe preview message. No message will be sent.'),
    warnings: ['live_send_disabled'],
  });
}
module.exports = { createMessageDraftPreview };
