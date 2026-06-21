// lib/franchisePortal/salesSummaryPreview.js — Safe per-outlet sales summary preview. No mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./franchisePortalModel');
const { maskRef, safeText } = require('./redactor');

function getSalesSummaryPreview(input = {}) {
  const { franchise } = store.findFranchisePreview(input);
  const items = (franchise.outlets || []).map((o) => ({
    outletIdPreview: maskRef(o.id, 'outlet'),
    nameSafe: safeText(o.name),
    salesMtdPreview: Number(o.salesMTD || 0),
  }));
  const totalSales = items.reduce((s, i) => s + i.salesMtdPreview, 0);
  return safeResponse({ liveSalesMutation: false, outletsSalesPreview: items, totalSalesMtdPreview: totalSales });
}
module.exports = { getSalesSummaryPreview };
