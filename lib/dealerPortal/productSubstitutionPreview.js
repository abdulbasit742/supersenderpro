// lib/dealerPortal/productSubstitutionPreview.js — Product substitution suggestion preview. No order creation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./dealerPortalModel');
const { maskRef, safeText } = require('./redactor');

function createProductSubstitutionPreview(input = {}) {
  const { dealer } = store.findDealerPreview(input);
  const subs = dealer.substitutions || {};
  const pid = input.productId || input.id;
  const warnings = [];
  let suggestions = [];
  if (pid && subs[pid]) {
    suggestions = subs[pid].map((s) => ({ productIdPreview: maskRef(s.id, 'prod'), nameSafe: safeText(s.name), reasonPreview: safeText(s.reason) }));
  } else {
    // Default: suggest in-stock alternatives for any out-of-stock catalog item.
    const catalog = dealer.catalog || [];
    const outOfStock = catalog.find((c) => Number(c.stock || 0) === 0);
    if (outOfStock && subs[outOfStock.id]) {
      suggestions = subs[outOfStock.id].map((s) => ({ productIdPreview: maskRef(s.id, 'prod'), nameSafe: safeText(s.name), reasonPreview: safeText(s.reason) }));
    }
  }
  if (!suggestions.length) warnings.push('no_substitution_preview');
  return safeResponse({ liveOrderCreation: false, substitutionSuggestionsPreview: suggestions, warnings });
}
module.exports = { createProductSubstitutionPreview };
