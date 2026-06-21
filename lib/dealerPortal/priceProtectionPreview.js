// lib/dealerPortal/priceProtectionPreview.js — Price protection preview. No price mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./dealerPortalModel');
const { maskName, maskRef } = require('./redactor');

function createPriceProtectionPreview(input = {}) {
  const { dealer } = store.findDealerPreview(input);
  const pid = input.productId || input.id;
  const list = (dealer.priceProtection || [])
    .filter((p) => (pid ? p.id === pid : true))
    .map((p) => ({
      productIdPreview: maskRef(p.id, 'prod'),
      oldPricePreview: Number(p.oldPrice || 0),
      newPricePreview: Number(p.newPrice || 0),
      protectedDeltaPreview: Number(p.oldPrice || 0) - Number(p.newPrice || 0),
      protectedUntilPreview: p.protectedUntil || '',
    }));
  return safeResponse({
    livePriceMutation: false,
    dealerMasked: maskName(dealer.name),
    priceProtectionPreview: list,
    warnings: list.length ? [] : ['price_list_missing'],
  });
}
module.exports = { createPriceProtectionPreview };
