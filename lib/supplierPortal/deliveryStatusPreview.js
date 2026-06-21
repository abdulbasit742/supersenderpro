 'use strict';
 const { make } = require('./_statusPreviewFactory');
 module.exports = { forToken: make('delivery', { attention: ['delayed', 'in_transit'], detail: () => ({ note: 'Delivery status preview only; no confirm-delivery action.' }) }) };
