// lib/dealerPortal/crossSellUpsellPreview.js — Cross-sell / upsell recommendation preview. No order creation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./dealerPortalModel');
const { maskRef, safeText } = require('./redactor');

function createCrossSellUpsellPreview(input = {}) {
  const { dealer } = store.findDealerPreview(input);
  const cs = dealer.crossSell || {};
  const pid = input.productId || input.id || Object.keys(cs)[0];
  const recs = (cs[pid] || []).map((s) => ({ productIdPreview: maskRef(s.id, 'prod'), nameSafe: safeText(s.name), reasonPreview: safeText(s.reason) }));
  return safeResponse({ liveOrderCreation: false, crossSellUpsellPreview: recs, warnings: recs.length ? [] : ['no_recommendation_preview'] });
}
module.exports = { createCrossSellUpsellPreview };
