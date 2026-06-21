 'use strict';
 const { make } = require('./_statusPreviewFactory');
 module.exports = { forToken: make('service_work_order', { attention: ['in_progress', 'awaiting_parts'], detail: () => ({
 note: 'Service work order status preview only.' }) }) };
