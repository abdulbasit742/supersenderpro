// lib/dealerPortal/bulkImportPreview.js — Bulk CSV/rows order import PREVIEW. Never imports or creates orders.
'use strict';
const store = require('./store');
const { safeResponse } = require('./dealerPortalModel');
const { maskRef } = require('./redactor');

// Parses provided rows or a small CSV string. Validates only; never creates anything.
function parseRows(input) {
  if (Array.isArray(input.rows)) return input.rows;
  if (typeof input.csv === 'string' && input.csv.trim()) {
    const lines = input.csv.trim().split(/\r?\n/);
    const header = lines.shift().split(',').map((h) => h.trim().toLowerCase());
    return lines.map((ln) => {
      const cols = ln.split(',');
      const row = {};
      header.forEach((h, i) => { row[h] = (cols[i] || '').trim(); });
      return row;
    });
  }
  return [];
}

function createBulkImportPreview(input = {}) {
  const { dealer } = store.findDealerPreview(input);
  const catalog = dealer.catalog || [];
  const rows = parseRows(input);
  const errors = [];
  let valid = 0;
  const itemsPreview = [];
  rows.forEach((row, idx) => {
    const pid = row.productid || row.productId || row.id || row.sku;
    const qty = Number(row.qty || row.quantity || 0);
    const product = catalog.find((c) => c.id === pid);
    if (!pid) { errors.push({ rowPreview: idx + 1, errorPreview: 'missing_product' }); return; }
    if (!product) { errors.push({ rowPreview: idx + 1, errorPreview: 'unknown_product' }); return; }
    if (qty <= 0) { errors.push({ rowPreview: idx + 1, errorPreview: 'invalid_qty' }); return; }
    if (product.moq && qty < product.moq) { errors.push({ rowPreview: idx + 1, errorPreview: 'moq_not_met' }); return; }
    valid += 1;
    itemsPreview.push({ productIdPreview: maskRef(pid, 'prod'), qtyPreview: qty, unitPricePreview: Number(product.dealerPrice || 0), lineTotalPreview: qty * Number(product.dealerPrice || 0) });
  });
  const subtotal = itemsPreview.reduce((s, i) => s + i.lineTotalPreview, 0);
  return safeResponse({
    liveImport: false,
    liveOrderCreation: false,
    parsedRowsPreview: rows.length,
    validRowsPreview: valid,
    invalidRowsPreview: errors.length,
    errorsPreview: errors,
    draftOrderPreview: { itemsPreview, subtotalPreview: subtotal, totalPreview: subtotal },
    warnings: errors.length ? ['bulk_import_has_errors_preview'] : [],
  });
}
module.exports = { createBulkImportPreview };
