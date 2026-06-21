// lib/vendorPortal/supportRequestPreview.js — Draft a vendor support request PREVIEW. No ticket creation, no live send.
'use strict';
const store = require('./store');
const { safeResponse } = require('./vendorPortalModel');
const { maskName, safeText } = require('./redactor');

function createSupportRequestPreview(input = {}) {
  const { vendor } = store.findVendorPreview(input);
  return safeResponse({
    liveTicketCreation: false,
    liveMessageSend: false,
    vendorMasked: maskName(vendor.name),
    requestPreview: {
      categoryPreview: safeText(input.category || 'general'),
      subjectPreview: safeText(input.subject || 'Vendor support request'),
      messagePreview: safeText(input.message || 'This is a safe support preview. No ticket is created and no message is sent.'),
    },
    warnings: ['live_send_disabled'],
  });
}
module.exports = { createSupportRequestPreview };
