 'use strict';
 const { make } = require('./_statusPreviewFactory');
 module.exports = { forToken: make('warranty_repair', { attention: ['in_repair', 'awaiting_approval'], detail: () => ({
 note: 'Warranty/repair status preview only.' }) }) };
