  'use strict';
  const { make } = require('./_statusPreviewFactory');
  module.exports = { forToken: make('rfq', { attention: ['open', 'invited'], liveFlags: { liveRfqMutation: false }, detail:
  () => ({ note: 'RFQ status preview only; no RFQ mutation.' }) }) };
