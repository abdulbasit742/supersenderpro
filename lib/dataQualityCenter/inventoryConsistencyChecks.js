  'use strict';

  const fs = require('fs');
  const path = require('path');
  const productChecks = require('./productQualityChecks');

  const ROOT = process.cwd();

  function loadStock() {
      const candidates = [
        path.join(ROOT, 'data', 'inventory.json'),
          path.join(ROOT, 'data', 'inventoryControl', 'stock.json'),
          path.join(ROOT, 'data', 'stock.json'),
      ];
      for (const file of candidates) {
          try {
            if (fs.existsSync(file)) {
                  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
                  if (Array.isArray(parsed)) return parsed;
                  if (parsed && Array.isArray(parsed.stock)) return parsed.stock;
              }
          } catch (_) { /* try next */ }
      }
      return [];
  }

  function run() {
      const stock = loadStock();
      const products = productChecks.loadProducts();
      const productIds = new Set(products.map((p) => String(p.id)));
      const stockProductIds = new Set();
      const issues = [];

      stock.forEach((row, idx) => {
        const id = row.id != null ? row.id : `idx_${idx}`;
          const pid = row.productId != null ? String(row.productId) : null;
          if (pid) stockProductIds.add(pid);
          if (pid && !productIds.has(pid)) {
            issues.push({ ruleId: 'INV_ORPHAN_STOCK', entity: 'inventory', severity: 'medium', ref: { stockId: id, productId:
  pid }, message: 'Stock row for unknown product' });
      }
          const qty = Number(row.qty != null ? row.qty : row.quantity);
          if (Number.isFinite(qty) && qty < 0) {
        issues.push({ ruleId: 'INV_NEGATIVE_QTY', entity: 'inventory', severity: 'high', ref: { stockId: id }, message:
  'Negative stock quantity' });
          }


   });

   products.forEach((p) => {
     if (!stockProductIds.has(String(p.id))) {
       issues.push({ ruleId: 'INV_PRODUCT_NO_STOCK', entity: 'inventory', severity: 'low', ref: { productId: p.id },
message: 'Product has no stock record' });
   }
   });

   return issues;
}

module.exports = { loadStock, run };
