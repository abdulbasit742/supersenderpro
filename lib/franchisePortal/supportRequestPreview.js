// lib/franchisePortal/supportRequestPreview.js — Draft a franchise support request PREVIEW. No ticket creation, no live send.
'use strict';
const store = require('./store');
const { safeResponse } = require('./franchisePortalModel');
const { maskName, safeText } = require('./redactor');

function createSupportRequestPreview(input = {}) {
  const { franchise } = store.findFranchisePreview(input);
  return safeResponse({
    liveTicketCreation: false,
    liveMessageSend: false,
    franchiseMasked: maskName(franchise.name),
    requestPreview: {
      categoryPreview: safeText(input.category || 'general'),
      subjectPreview: safeText(input.subject || 'Franchise support request'),
      messagePreview: safeText(input.message || 'This is a safe support preview. No ticket is created and no message is sent.'),
    },
    warnings: ['live_send_disabled'],
  });
}
module.exports = { createSupportRequestPreview };
