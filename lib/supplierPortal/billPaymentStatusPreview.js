  'use strict';
  const { make } = require('./_statusPreviewFactory');
  module.exports = { forToken: make('bill_payment', { attention: ['overdue', 'pending'], liveFlags: { livePaymentAction:
  false, liveBillMutation: false }, detail: () => ({ note: 'Bill/payment status preview only; no payment action.' }) }) };
