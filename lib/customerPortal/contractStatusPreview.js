 'use strict';
 const { make } = require('./_statusPreviewFactory');
 module.exports = { forToken: make('contract', { attention: ['expiring_soon', 'expired'], detail: () => ({ note:
 'Contract/service plan status preview only.' }) }) };
