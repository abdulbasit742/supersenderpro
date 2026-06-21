 'use strict';
 /**
     * inventoryAnalyzer.js — stock status + inventory signals. Thresholds via env
     * with safe defaults. Pure function; no mutation.
  */
 function thresholds() {
     return {
       low: Number(process.env.PRODUCT_BI_LOW_STOCK || 10),
       overstock: Number(process.env.PRODUCT_BI_OVERSTOCK || 500),
       deadDays: Number(process.env.PRODUCT_BI_DEAD_DAYS || 90),
     };
 }

 function analyze(product) {

   const t = thresholds();
   const qty = Number(product.stockQty) || 0;
   const signals = [];
   let stockStatus = 'in_stock';

   if (qty <= 0) { stockStatus = 'out_of_stock'; signals.push('out_of_stock'); }
   else if (qty <= t.low) { stockStatus = 'low_stock'; signals.push('low_stock', 'reorder_needed'); }
   else if (qty >= t.overstock) { stockStatus = 'overstock'; signals.push('overstock', 'stock_value_high'); }

   const days = Number(product.daysSinceLastSale) || 0;
   if (days >= t.deadDays && qty > 0) { stockStatus = 'dead_stock'; signals.push('dead_stock'); }
   if (days >= 30) signals.push('unsold_30_days');
   if (days >= 60) signals.push('unsold_60_days');
   if (days >= 90) signals.push('unsold_90_days');


   if ((Number(product.reservedQty) || 0) > qty) signals.push('reserved_stock_high', 'negative_stock_preview');
   if (product.costPrice == null || product.costPrice === 0) signals.push('missing_cost_price');
   if (product.salePrice == null || product.salePrice === 0) signals.push('missing_sale_price');


   const sold = Number(product.soldQtyPreview) || 0;
   const returned = Number(product.returnedQtyPreview) || 0;
   if (sold > 0 && returned / sold > 0.2) signals.push('return_rate_high');
   if (sold >= 100) signals.push('fast_moving');
   else if (sold > 0 && sold < 5) signals.push('slow_moving');

   const stockValuePreview = qty * (Number(product.costPrice) || 0);
   return { stockStatus, signals, stockValuePreview };
 }
 module.exports = { analyze, thresholds };
