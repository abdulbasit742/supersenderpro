// lib/staffPortal/hrSupportRequestPreview.js — Safe HR support request DRAFT. No ticket creation, no message send.
'use strict';
const { safeResponse } = require('./staffPortalModel');
const { safeText } = require('./redactor');

function createHrSupportRequestPreview(input = {}) {
  const blockers = [];
  if (!input.message) blockers.push('missing_request_detail');
  return safeResponse({
    liveTicketCreation: false,
    liveMessageSend: false,
    requestPreview: {
      categorySafe: safeText(input.category || 'general'),
      subjectSafe: safeText(input.subject || 'HR support request'),
      messageSafe: safeText(input.message || ''),
    },
    suggestedTicketPreview: { statusPreview: 'open_preview', priorityPreview: input.priority || 'normal' },
    blockers,
  });
}
module.exports = { createHrSupportRequestPreview };
