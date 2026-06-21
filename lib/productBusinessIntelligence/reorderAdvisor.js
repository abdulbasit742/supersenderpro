 'use strict';
 /**
  * reorderAdvisor.js — suggests a reorder qty preview. Never creates a PO.
  */
 function advise(product) {
   const qty = Number(product.stockQty) || 0;
   const sold = Number(product.soldQtyPreview) || 0;
   const low = Number(process.env.PRODUCT_BI_LOW_STOCK || 10);
   const velocity = sold / 30; // approx daily
   const targetDays = 30;
   let suggestedReorderQty = 0;
   let reason = 'stock_sufficient';
   if (qty <= 0 && sold > 0) { suggestedReorderQty = Math.ceil(velocity * targetDays) || low; reason =
 'out_of_stock_with_demand'; }
   else if (qty <= low && sold > 0) { suggestedReorderQty = Math.max(low, Math.ceil(velocity * targetDays) - qty); reason
 = 'below_low_threshold'; }

   else if (qty <= low) { suggestedReorderQty = low; reason = 'below_low_threshold_no_recent_sales'; }
   const warnings = [];
   if (Number(product.daysSinceLastSale) >= 90) { suggestedReorderQty = 0; reason = 'dead_stock_do_not_reorder';
 warnings.push('dead_stock'); }
   return { ok: true, dryRun: true, livePurchaseOrder: false, productId: product.id, currentStock: qty,
 suggestedReorderQty, reason, warnings, blockers: [] };
 }
 module.exports = { advise };
