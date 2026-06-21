// lib/dealerPortal/dealerQuoteComparisonPreview.js — Compare quote scenarios preview. No quote mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./dealerPortalModel');
const { maskName } = require('./redactor');

function createDealerQuoteComparisonPreview(input = {}) {
  const { dealer } = store.findDealerPreview(input);
  const catalog = dealer.catalog || [];
  const product = catalog.find((c) => c.id === (input.productId || input.id)) || catalog[0] || {};
  const base = Number(product.dealerPrice || product.retailPrice || 0);
  const tier = String(dealer.tier || 'silver').toLowerCase();
  const tierPct = Number((dealer.tierDiscounts || {})[tier] || 0);
  const scenarios = [
    { labelPreview: 'list_price_preview', unitPricePreview: Number(product.retailPrice || base) },
    { labelPreview: 'dealer_price_preview', unitPricePreview: base },
    { labelPreview: 'tier_adjusted_preview', unitPricePreview: Math.max(0, base - Math.round(base * (tierPct / 100))) },
  ];
  const cp = (dealer.contractPrices || []).find((c) => c.id === product.id);
  if (cp) scenarios.push({ labelPreview: 'contract_price_preview', unitPricePreview: Number(cp.contractPrice || 0) });
  const best = scenarios.reduce((m, s) => (s.unitPricePreview < m.unitPricePreview ? s : m), scenarios[0]);
  return safeResponse({
    liveQuoteMutation: false,
    dealerMasked: maskName(dealer.name),
    scenariosPreview: scenarios,
    bestOptionPreview: best.labelPreview,
    warnings: [],
  });
}
module.exports = { createDealerQuoteComparisonPreview };
