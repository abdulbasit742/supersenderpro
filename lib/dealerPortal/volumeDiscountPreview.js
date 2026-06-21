// lib/dealerPortal/volumeDiscountPreview.js — Volume discount tier preview. No price mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./dealerPortalModel');

function getVolumeDiscountPreview(input = {}) {
  const { dealer } = store.findDealerPreview(input);
  const tiers = (dealer.volumeDiscountTiers || []).map((t) => ({ minQtyPreview: Number(t.minQty || 0), percentPreview: Number(t.percent || 0) }));
  const qty = Number(input.qty || input.quantity || 0);
  let applicable = 0;
  tiers.forEach((t) => { if (qty >= t.minQtyPreview) applicable = t.percentPreview; });
  return safeResponse({ livePriceMutation: false, qtyPreview: qty, applicableVolumeDiscountPreview: applicable, volumeTiersPreview: tiers, warnings: [] });
}
module.exports = { getVolumeDiscountPreview };
