// lib/dealerPortal/catalogPreview.js — Safe product catalog preview. No price/stock mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./dealerPortalModel');
const { maskRef, safeText } = require('./redactor');

function listCatalog(input = {}) {
  const { dealer } = store.findDealerPreview(input);
  const items = (dealer.catalog || []).map((p) => ({
    productIdPreview: maskRef(p.id, 'prod'),
    nameSafe: safeText(p.name),
    retailPricePreview: Number(p.retailPrice || 0),
    inStockPreview: Number(p.stock || 0) > 0,
  }));
  return safeResponse({ livePriceMutation: false, liveStockMutation: false, catalogPreview: items });
}
module.exports = { listCatalog };
