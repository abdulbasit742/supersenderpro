// lib/dealerPortal/supportRequestPreview.js — Draft a dealer support request PREVIEW. No ticket creation, no live send.
'use strict';
const store = require('./store');
const { safeResponse } = require('./dealerPortalModel');
const { maskName, safeText } = require('./redactor');

function createSupportRequestPreview(input = {}) {
  const { dealer } = store.findDealerPreview(input);
  return safeResponse({
    liveTicketCreation: false,
    liveMessageSend: false,
    dealerMasked: maskName(dealer.name),
    requestPreview: {
      categoryPreview: safeText(input.category || 'general'),
      subjectPreview: safeText(input.subject || 'Dealer support request'),
      messagePreview: safeText(input.message || 'This is a safe support preview. No ticket is created and no message is sent.'),
    },
    warnings: ['live_send_disabled'],
  });
}
module.exports = { createSupportRequestPreview };
