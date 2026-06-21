 'use strict';
 /**
  * lossLeakageDetector.js — aggregates revenue-leakage signals across products.
  */
 function detect(products) {
   const leaks = [];
   (products || []).forEach((p) => {
     const sale = Number(p.salePrice) || 0;
     const cost = Number(p.costPrice) || 0;
     const sold = Number(p.soldQtyPreview) || 0;
     const returned = Number(p.returnedQtyPreview) || 0;
     if (sale > 0 && sale < cost) leaks.push({ id: p.id, name: p.name, type: 'price_below_cost', impactPreview: (cost -
 sale) * sold });

     if (sold > 0 && returned / sold > 0.2) leaks.push({ id: p.id, name: p.name, type: 'high_refund_rate', impactPreview:
 sale * returned });
     if (sale > 0 && Math.round(((sale - cost) / sale) * 100) < 10 && sold >= 50) leaks.push({ id: p.id, name: p.name,
 type: 'low_margin_high_volume', impactPreview: Math.round((sale - cost) * sold) });
     if ((Number(p.daysSinceLastSale) || 0) >= 90 && (Number(p.stockQty) || 0) > 0) leaks.push({ id: p.id, name: p.name,
 type: 'dead_stock_holding', impactPreview: Math.round((Number(p.stockQty) || 0) * cost * 0.02) });
   });
   const totalLeakagePreview = leaks.reduce((a, l) => a + (l.impactPreview || 0), 0);
   return { totalLeakagePreview, leaks };
 }
 module.exports = { detect };
