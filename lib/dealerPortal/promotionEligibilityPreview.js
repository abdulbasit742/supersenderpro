// lib/dealerPortal/promotionEligibilityPreview.js — Promotion eligibility preview. No promotion mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./dealerPortalModel');
const { maskRef, safeText } = require('./redactor');

function getPromotionEligibilityPreview(input = {}) {
  const { dealer } = store.findDealerPreview(input);
  const list = (dealer.promotions || []).map((p) => ({
    promotionIdPreview: maskRef(p.id, 'promo'),
    nameSafe: safeText(p.name),
    eligiblePreview: !!p.eligible,
    benefitPreview: safeText(p.benefit || ''),
    reasonPreview: p.eligible ? '' : safeText(p.reason || 'not_eligible_preview'),
  }));
  return safeResponse({ livePromotionMutation: false, promotionEligibilityPreview: list, warnings: [] });
}
module.exports = { getPromotionEligibilityPreview };
