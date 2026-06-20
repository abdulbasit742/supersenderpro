// lib/customerPortal/messageDrafts.js — Safe draft previews: messages, reschedule, payment reminders. Never sends.
'use strict';

const store = require('./store');
const { safeResponse } = require('./customerPortalModel');
const { maskPhone, safeText } = require('./redactor');

function recipientMasked(input) {
  const { customer } = store.findCustomerPreview(input);
  return maskPhone(input.recipient || (customer && customer.phone) || '');
}

function createMessageDraftPreview(input = {}) {
  return safeResponse({
    liveSend: false,
    channel: `${input.channel || 'whatsapp'}_preview`,
    recipientMasked: recipientMasked(input),
    messagePreview: safeText(input.message || 'Hello, this is a safe preview message. No message will be sent.'),
    warnings: ['live_send_disabled'],
  });
}

function createRescheduleRequestPreview(input = {}) {
  return safeResponse({
    liveCalendarWrite: false,
    liveBookingMutation: false,
    bookingIdPreview: 'book_****',
    requestedTimePreview: safeText(input.requestedTime || ''),
    statusPreview: 'reschedule_request_preview',
    warnings: ['live_send_disabled'],
  });
}

function createPaymentReminderPreview(input = {}) {
  return safeResponse({
    livePayment: false,
    liveSend: false,
    channel: `${input.channel || 'whatsapp'}_preview`,
    recipientMasked: recipientMasked(input),
    invoiceIdPreview: 'inv_****',
    messagePreview: safeText(input.message || 'Friendly reminder: an invoice is pending. This is a preview only — no payment is collected and no message is sent.'),
    warnings: ['payment_action_disabled', 'live_send_disabled'],
  });
}

module.exports = { createMessageDraftPreview, createRescheduleRequestPreview, createPaymentReminderPreview };
