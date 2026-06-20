// lib/customerPortal/supportRequestPreview.js — Safe support-request preview. No live ticket creation or message send.
'use strict';

const { safeResponse } = require('./customerPortalModel');
const { safeText } = require('./redactor');

function createSupportRequestPreview(input = {}) {
  const subject = safeText(input.subject || 'Support request');
  const message = safeText(input.message || '');
  const blockers = [];
  if (!message) blockers.push('missing_customer_contact');
  return safeResponse({
    liveTicketCreation: false,
    liveMessageSend: false,
    requestPreview: { subjectSafe: subject, messageSafe: message, channel: 'portal_preview' },
    suggestedTicketPreview: {
      statusPreview: 'open_preview',
      priorityPreview: input.priority || 'normal',
      categoryPreview: safeText(input.category || 'general'),
    },
    blockers,
  });
}

module.exports = { createSupportRequestPreview };
