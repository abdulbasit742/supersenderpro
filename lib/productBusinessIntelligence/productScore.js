 'use strict';
 /**
  * productScore.js — 0..100 business score from margin, velocity, stock health,
  * and risk signal penalties. Pure function.
  */
 const stockHealth = require('./stockHealth');
 const registry = require('./featureSignalRegistry');
 function score(product) {
   const sh = stockHealth.score(product);
   const m = product.salePrice > 0 ? Math.round(((product.salePrice - product.costPrice) / product.salePrice) * 100) : 0;
   const sold = Number(product.soldQtyPreview) || 0;
   let s = 50;
   s += Math.max(-25, Math.min(25, m / 2));          // margin contribution
   s += Math.min(15, sold / 20);                        // velocity contribution
   s += (sh.healthScore - 50) * 0.2;                    // stock health contribution
   const fired = registry.evaluate(product);
   const highRisks = fired.filter((f) => f.category === 'risk' && f.severity === 'high').length;
   s -= highRisks * 8;
   s = Math.max(0, Math.min(100, Math.round(s)));
   return { businessScore: s, marginPreview: m, stockHealth: sh.label, firedSignals: fired.length, highRiskSignals:
 highRisks };
 }
 module.exports = { score };
