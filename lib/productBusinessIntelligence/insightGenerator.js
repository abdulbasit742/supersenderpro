 'use strict';
 /**
  * insightGenerator.js — turns signals into plain-language recommendations.
  */
 const marginCalculator = require('./marginCalculator');
 const reorderAdvisor = require('./reorderAdvisor');
 function forProduct(product, firedSignals) {
     const recs = [];
     const names = (firedSignals || []).map((s) => s.name);
   if (names.includes('price_below_cost')) recs.push('Price is below cost. Raise sale price to at least ' +
 marginCalculator.suggestedPrice(product.costPrice, 35) + '.');
   if (names.includes('margin_too_low') || names.includes('margin_negative')) recs.push('Margin is too low. Suggested price for 35% margin: ' + marginCalculator.suggestedPrice(product.costPrice, 35) + '.');
     if (names.includes('dead_stock')) recs.push('Dead stock detected. Consider a clearance offer; do not reorder.');
     if (names.includes('low_stock') || names.includes('out_of_stock')) { const r = reorderAdvisor.advise(product); if
 (r.suggestedReorderQty > 0) recs.push('Reorder ~' + r.suggestedReorderQty + ' units (' + r.reason + ').'); }
   if (names.includes('high_refund_rate')) recs.push('High refund rate. Review product quality or listing accuracy.');
     if (names.includes('fast_moving')) recs.push('Fast mover. Keep stock buffered and consider an upsell bundle.');
     if (names.includes('low_margin_high_volume')) recs.push('High volume but thin margin. Small price increase could yield large profit gains.');
   if (!recs.length) recs.push('No action needed; product looks healthy.');
     return recs;
 }
 module.exports = { forProduct };
