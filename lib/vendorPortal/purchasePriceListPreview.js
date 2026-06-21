// lib/vendorPortal/purchasePriceListPreview.js — Safe agreed purchase price list preview. No price mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./vendorPortalModel');
const { maskRef, maskName, safeText } = require('./redactor');

function getPurchasePriceListPreview(input = {}) {
  const { vendor } = store.findVendorPreview(input);
  const prices = (vendor.supplyCatalog || []).map((p) => ({
    skuIdPreview: maskRef(p.id, 'sku'),
    nameSafe: safeText(p.name),
    agreedPricePreview: Number(p.agreedPrice || 0),
    moqPreview: Number(p.moq || 0),
  }));
  return safeResponse({ livePriceMutation: false, vendorMasked: maskName(vendor.name), priceListPreview: prices });
}
module.exports = { getPurchasePriceListPreview };
