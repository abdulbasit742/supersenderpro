 'use strict';
 /**
  * stockHealth.js — rolls inventory signals into a 0..100 health score + label.
  */
 const inventoryAnalyzer = require('./inventoryAnalyzer');
 function score(product) {
   const inv = inventoryAnalyzer.analyze(product);
   let s = 100;
   const penalty = { out_of_stock: 40, dead_stock: 35, low_stock: 15, overstock: 15, reserved_stock_high: 10,
 return_rate_high: 15, missing_cost_price: 10, missing_sale_price: 10, unsold_90_days: 20, unsold_60_days: 10 };
   inv.signals.forEach((sig) => { s -= (penalty[sig] || 0); });
   s = Math.max(0, Math.min(100, s));
   const label = s >= 75 ? 'healthy' : s >= 45 ? 'watch' : 'unhealthy';
   return { healthScore: s, label, stockStatus: inv.stockStatus, signals: inv.signals, stockValuePreview:
 inv.stockValuePreview };
 }
 module.exports = { score };
