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

function getCatalogItemStatus(input = {}) {
  const { dealer } = store.findDealerPreview(input);
  const id = input.id || input.reference;
  const p = (dealer.catalog || []).find((c) => c.id === id) || {};
  const warnings = [];
  const inStock = Number(p.stock || 0) > 0;
  if (!inStock) warnings.push('stock_unavailable');
  else if (Number(p.stock || 0) < (p.moq || 0)) warnings.push('low_stock');
  return safeResponse({
    livePriceMutation: false,
    liveStockMutation: false,
    productIdPreview: maskRef(p.id || 'prod', 'prod'),
    nameSafe: safeText(p.name || 'unknown'),
    inStockPreview: inStock,
    moqPreview: Number(p.moq || 0),
    warnings,
  });
}
module.exports = { listCatalog, getCatalogItemStatus };
