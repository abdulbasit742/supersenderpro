 'use strict';
 /**
  * profitLossAnalyzer.js — profit/loss preview + loss-type signals. Pure function.
  */
 function analyze(product) {
   const sale = Number(product.salePrice) || 0;
   const cost = Number(product.costPrice) || 0;
   const sold = Number(product.soldQtyPreview) || 0;
   const returned = Number(product.returnedQtyPreview) || 0;

   const revenuePreview = sale * sold;
   const costPreview = cost * sold;
   const profitPreview = revenuePreview - costPreview;
   const refundLossPreview = sale * returned;
   const signals = [];


   if (profitPreview > 0) signals.push('profit_positive');
   if (profitPreview < 0) signals.push('profit_negative', 'loss_detected');
   if (refundLossPreview > 0) signals.push('refund_loss', 'return_loss_preview');
   if (sale > 0 && sale < cost) signals.push('price_below_cost');

   const marginPct = sale > 0 ? Math.round(((sale - cost) / sale) * 100) : 0;

     if (marginPct >= 25) signals.push('margin_good');
     else if (marginPct >= 0) signals.push('margin_low');

     // Holding cost preview for slow/dead stock.
     const days = Number(product.daysSinceLastSale) || 0;
     const qty = Number(product.stockQty) || 0;
     const holdingCostPreview = days >= 90 ? Math.round(qty * cost * 0.02) : 0;
     if (holdingCostPreview > 0) signals.push('inventory_holding_cost_preview', 'dead_stock_loss_preview');

     return {
       revenuePreview, costPreview, profitPreview,
       lossPreview: profitPreview < 0 ? Math.abs(profitPreview) : 0,
       refundLossPreview, holdingCostPreview, marginPreview: marginPct, signals,
     };
 }
 module.exports = { analyze };
