// lib/dealerPortal/dealRegistrationPreview.js — Deal registration preview. No deal/CRM creation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./dealerPortalModel');
const { maskName, safeText } = require('./redactor');

function createDealRegistrationPreview(input = {}) {
  const { dealer } = store.findDealerPreview(input);
  return safeResponse({
    liveDealCreation: false,
    liveCrmMutation: false,
    dealerMasked: maskName(dealer.name),
    dealPreview: {
      nameSafe: safeText(input.name || 'Deal ****'),
      valuePreview: Number(input.value || 0),
      stagePreview: 'draft_preview',
    },
    conflictCheckPreview: { conflictDetectedPreview: false },
    warnings: ['live_send_disabled'],
  });
}
module.exports = { createDealRegistrationPreview };
