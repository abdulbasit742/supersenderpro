 'use strict';
 /**
  * revenueAnalyzer.js — revenue signals + ranking helpers. Pure functions.
  */
 function analyze(product) {
     const sale = Number(product.salePrice) || 0;
     const sold = Number(product.soldQtyPreview) || 0;
     const revenuePreview = sale * sold;
     const signals = [];
     if (sold >= 100) signals.push('high_order_count');
     else if (sold > 0 && sold < 5) signals.push('low_order_count');
     if (product.category === 'subscription') signals.push('recurring_revenue_preview');
     if (sold >= 50) signals.push('repeat_purchase_product', 'upsell_opportunity');
     return { revenuePreview, signals };
 }


 function rank(products) {
   const list = (products || []).map((p) => ({ id: p.id, name: p.name, revenuePreview: (Number(p.salePrice) || 0) *
 (Number(p.soldQtyPreview) || 0) }));
     list.sort((a, b) => b.revenuePreview - a.revenuePreview);
     return { top: list.slice(0, 5).map((x) => Object.assign({}, x, { signal: 'top_revenue_product' })), bottom:
 list.slice(-5).map((x) => Object.assign({}, x, { signal: 'low_revenue_product' })) };
 }
 module.exports = { analyze, rank };
