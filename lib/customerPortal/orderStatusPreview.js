 'use strict';
 const { make } = require('./_statusPreviewFactory');
 // reads bookingCenter/receivables only if present; falls back to stored label
 module.exports = { forToken: make('order', { attention: ['processing', 'on_hold'], detail: (c) => ({ note: 'Order status preview only; no order mutation.' }) }) };
