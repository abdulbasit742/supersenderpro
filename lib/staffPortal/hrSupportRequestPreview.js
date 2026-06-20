// lib/staffPortal/hrSupportRequestPreview.js — Draft an HR support request PREVIEW. No ticket creation, no live send.
'use strict';

const store = require('./store');
const { safeResponse } = require('./staffPortalModel');
const { maskName, safeText } = require('./redactor');

function createHrSupportRequestPreview(input = {}) {
  const { staff } = store.findStaffPreview(input);
  const requestPreview = {
    staffMasked: maskName(staff.name),
    categoryPreview: safeText(input.category || 'general'),
    subjectPreview: safeText(input.subject || 'HR support request'),
    messagePreview: safeText(input.message || 'This is a safe HR support preview. No ticket is created and no message is sent.'),
  };
  return safeResponse({
    liveTicketCreation: false,
    liveMessageSend: false,
    requestPreview,
    suggestedHrTicketPreview: {
      priorityPreview: safeText(input.priority || 'normal'),
      queuePreview: 'hr_queue_preview',
      statusPreview: 'draft_preview',
    },
    warnings: ['live_send_disabled'],
  });
}

module.exports = { createHrSupportRequestPreview };
