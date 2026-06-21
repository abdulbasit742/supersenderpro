// lib/dealerPortal/onboardingPreview.js — Dealer onboarding progress preview. No live onboarding mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./dealerPortalModel');
const { maskName, safeText } = require('./redactor');

function getOnboardingPreview(input = {}) {
  const { dealer } = store.findDealerPreview(input);
  const ob = dealer.onboarding || {};
  const warnings = [];
  if ((ob.kycStatus || 'in_review') !== 'verified') warnings.push('compliance_required');
  return safeResponse({
    liveOnboardingMutation: false,
    dealerMasked: maskName(dealer.name),
    stagePreview: safeText(ob.stage || 'not_started'),
    stepsTotalPreview: Number(ob.stepsTotal || 0),
    stepsDonePreview: Number(ob.stepsDonePreview || 0),
    kycStatusPreview: `${ob.kycStatus || 'unknown'}_preview`,
    warnings,
  });
}
module.exports = { getOnboardingPreview };
