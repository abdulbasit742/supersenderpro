  'use strict';
  const { make } = require('./_statusPreviewFactory');
  module.exports = { forToken: make('quote', { attention: ['draft'], liveFlags: { liveQuoteMutation: false }, detail: () =>
  ({ note: 'Quote status preview only; submit is a draft, never live.' }) }) };
