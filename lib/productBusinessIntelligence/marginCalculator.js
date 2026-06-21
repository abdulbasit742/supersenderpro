 'use strict';
 /**
  * marginCalculator.js — margin %, markup, suggested price. Pure math.
  */
 function marginPct(cost, sale) { const c = Number(cost) || 0; const s = Number(sale) || 0; return s > 0 ? Math.round(((s
 - c) / s) * 100) : 0; }
 function markupPct(cost, sale) { const c = Number(cost) || 0; const s = Number(sale) || 0; return c > 0 ? Math.round(((s
 - c) / c) * 100) : 0; }
 function suggestedPrice(cost, targetMarginPct) { const c = Number(cost) || 0; const m = Number(targetMarginPct) || 35;
 return m >= 100 ? c : Math.round(c / (1 - m / 100)); }
 function assess(product) {
     const m = marginPct(product.costPrice, product.salePrice);
     const warnings = [];
   if (product.salePrice > 0 && product.costPrice > 0 && product.salePrice < product.costPrice)
 warnings.push('price_below_cost');
     if (m < 0) warnings.push('margin_negative');
     else if (m < 10) warnings.push('margin_too_low');
   return { marginPreview: m, markupPreview: markupPct(product.costPrice, product.salePrice), suggestedPricePreview:
 suggestedPrice(product.costPrice, 35), warnings };
 }
 module.exports = { marginPct, markupPct, suggestedPrice, assess };
