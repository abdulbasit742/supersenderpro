// lib/dealerPortal/contractPricePreview.js — Contract price list preview. No price mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./dealerPortalModel');
const { maskRef } = require('./redactor');

function getContractPricePreview(input = {}) {
  const { dealer } = store.findDealerPreview(input);
  const catalog = dealer.catalog || [];
  const warnings = [];
  const list = (dealer.contractPrices || []).map((cp) => {
    const p = catalog.find((c) => c.id === cp.id) || {};
    return {
      productIdPreview: maskRef(cp.id, 'prod'),
      retailPricePreview: Number(p.retailPrice || 0),
      contractPricePreview: Number(cp.contractPrice || 0),
      validTillPreview: cp.validTill || '',
    };
  });
  if (!list.length) warnings.push('contract_price_missing');
  return safeResponse({ livePriceMutation: false, contractPricesPreview: list, warnings });
}
module.exports = { getContractPricePreview };
