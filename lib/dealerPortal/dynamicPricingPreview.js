// lib/dealerPortal/dynamicPricingPreview.js — Dynamic pricing preview combining tier/volume/contract. No price mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./dealerPortalModel');
const { maskName, maskRef } = require('./redactor');

function createDynamicPricingPreview(input = {}) {
  const { dealer } = store.findDealerPreview(input);
  const catalog = dealer.catalog || [];
  const qty = Number(input.qty || input.quantity || 0);
  const product = catalog.find((c) => c.id === (input.productId || input.id)) || catalog[0] || {};
  const base = Number(product.dealerPrice || product.retailPrice || 0);
  const tier = String(dealer.tier || 'silver').toLowerCase();
  const tierPct = Number((dealer.tierDiscounts || {})[tier] || 0);
  let volPct = 0;
  (dealer.volumeDiscountTiers || []).forEach((t) => { if (qty >= Number(t.minQty || 0)) volPct = Number(t.percent || 0); });
  const cp = (dealer.contractPrices || []).find((c) => c.id === product.id);
  const tierDiscount = Math.round(base * (tierPct / 100));
  const volumeDiscount = Math.round(base * (volPct / 100));
  const contractPrice = cp ? Number(cp.contractPrice || 0) : 0;
  let finalPrice = base - tierDiscount - volumeDiscount;
  if (contractPrice && contractPrice < finalPrice) finalPrice = contractPrice;
  const marginImpact = base ? Math.round(((base - finalPrice) / base) * 100) : 0;
  return safeResponse({
    livePriceMutation: false,
    dealerMasked: maskName(dealer.name),
    productIdPreview: maskRef(product.id || 'prod', 'prod'),
    basePricePreview: base,
    tierDiscountPreview: tierDiscount,
    volumeDiscountPreview: volumeDiscount,
    contractPricePreview: contractPrice,
    finalPricePreview: Math.max(0, finalPrice),
    marginImpactPreview: marginImpact,
    warnings: [],
  });
}
module.exports = { createDynamicPricingPreview };
