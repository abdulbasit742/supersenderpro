// lib/vendorPortal/supplyCatalogPreview.js — Safe supply catalog (SKU) preview. No price/stock mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./vendorPortalModel');
const { maskRef, safeText } = require('./redactor');

function listSupplyCatalog(input = {}) {
  const { vendor } = store.findVendorPreview(input);
  const items = (vendor.supplyCatalog || []).map((p) => ({
    skuIdPreview: maskRef(p.id, 'sku'),
    nameSafe: safeText(p.name),
    leadTimeDaysPreview: Number(p.leadTimeDays || 0),
    moqPreview: Number(p.moq || 0),
  }));
  return safeResponse({ livePriceMutation: false, supplyCatalogPreview: items });
}
module.exports = { listSupplyCatalog };
