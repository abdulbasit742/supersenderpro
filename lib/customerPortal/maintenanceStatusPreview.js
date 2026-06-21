 'use strict';
 const { make } = require('./_statusPreviewFactory');

 module.exports = { forToken: make('maintenance_plan', { attention: ['due', 'expiring_soon'], detail: () => ({ note:
 'Maintenance plan status preview only.' }) }) };
