// lib/staffPortal/messageDrafts.js — Safe staff message DRAFT preview. Never sends.
'use strict';
const store = require('./store');
const { safeResponse } = require('./staffPortalModel');
const { maskPhone, safeText } = require('./redactor');

function createMessageDraftPreview(input = {}) {
  const { staff } = store.findStaffPreview(input);
  return safeResponse({
    liveSend: false,
    channel: `${input.channel || 'whatsapp'}_preview`,
    recipientMasked: maskPhone(input.recipient || (staff && staff.phone) || ''),
    messagePreview: safeText(input.message || 'Hello, this is a safe preview message. No message will be sent.'),
    warnings: ['live_send_disabled'],
  });
}
module.exports = { createMessageDraftPreview };
