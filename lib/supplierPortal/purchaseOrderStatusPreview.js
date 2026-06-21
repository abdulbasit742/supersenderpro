  'use strict';
  const { make } = require('./_statusPreviewFactory');
  module.exports = { forToken: make('purchase_order', { attention: ['pending_acceptance'], liveFlags: {
  livePurchaseOrderMutation: false }, detail: () => ({ note: 'PO status preview only; no accept/mutate.' }) }) };
