// lib/dealerPortal/wholesalePricePreview.js — Safe wholesale price preview. No price mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./dealerPortalModel');
const { maskRef, safeText } = require('./redactor');

function getWholesalePricePreview(input = {}) {
  const { dealer } = store.findDealerPreview(input);
  const prices = (dealer.catalog || []).map((p) => ({
    productIdPreview: maskRef(p.id, 'prod'),
    nameSafe: safeText(p.name),
    wholesalePricePreview: Number(p.wholesalePrice || 0),
    moqPreview: Number(p.moq || 0),
  }));
  return safeResponse({ livePriceMutation: false, wholesalePricesPreview: prices });
}
module.exports = { getWholesalePricePreview };
