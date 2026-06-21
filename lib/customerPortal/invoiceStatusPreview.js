 'use strict';
 const { make } = require('./_statusPreviewFactory');
 module.exports = { forToken: make('invoice', { attention: ['unpaid', 'overdue'], detail: (c) => ({ livePayment: false,
 note: 'Invoice status preview only; no payment.' }) }) };
