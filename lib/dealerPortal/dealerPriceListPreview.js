// lib/dealerPortal/dealerPriceListPreview.js — Safe dealer-specific price list preview. No price mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./dealerPortalModel');
const { maskRef, maskName, safeText } = require('./redactor');

function getDealerPriceListPreview(input = {}) {
  const { dealer } = store.findDealerPreview(input);
  const prices = (dealer.catalog || []).map((p) => ({
    productIdPreview: maskRef(p.id, 'prod'),
    nameSafe: safeText(p.name),
    dealerPricePreview: Number(p.dealerPrice || 0),
    moqPreview: Number(p.moq || 0),
  }));
  return safeResponse({ livePriceMutation: false, dealerMasked: maskName(dealer.name), priceListPreview: prices });
}
module.exports = { getDealerPriceListPreview };
