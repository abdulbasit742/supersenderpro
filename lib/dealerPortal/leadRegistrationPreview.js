// lib/dealerPortal/leadRegistrationPreview.js — Lead registration preview. No lead/CRM creation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./dealerPortalModel');
const { maskName, safeText } = require('./redactor');

function createLeadRegistrationPreview(input = {}) {
  const { dealer } = store.findDealerPreview(input);
  return safeResponse({
    liveLeadCreation: false,
    liveCrmMutation: false,
    dealerMasked: maskName(dealer.name),
    leadPreview: {
      companySafe: safeText(input.company || 'Prospect ****'),
      estimatedValuePreview: Number(input.estimatedValue || 0),
      statusPreview: 'draft_preview',
    },
    conflictCheckPreview: { conflictDetectedPreview: false },
    warnings: ['live_send_disabled'],
  });
}
module.exports = { createLeadRegistrationPreview };
