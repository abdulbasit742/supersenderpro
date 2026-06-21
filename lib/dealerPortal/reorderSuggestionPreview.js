// lib/dealerPortal/reorderSuggestionPreview.js — Smart reorder suggestion preview. No order creation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./dealerPortalModel');
const { maskRef, safeText } = require('./redactor');

function createReorderSuggestionPreview(input = {}) {
  const { dealer } = store.findDealerPreview(input);
  const catalog = dealer.catalog || [];
  const suggestions = catalog
    .filter((p) => Number(p.stock || 0) > 0)
    .map((p) => ({
      productIdPreview: maskRef(p.id, 'prod'),
      nameSafe: safeText(p.name),
      suggestedQtyPreview: Math.max(Number(p.moq || 0), 50),
      reasonPreview: 'historical_demand_preview',
    }));
  return safeResponse({ liveOrderCreation: false, reorderSuggestionsPreview: suggestions, warnings: [] });
}
module.exports = { createReorderSuggestionPreview };
