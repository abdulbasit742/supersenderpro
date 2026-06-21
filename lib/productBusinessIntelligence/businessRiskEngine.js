 'use strict';
 /**
  * businessRiskEngine.js — maps fired risk signals to a risk level + reasons.
  */
 const registry = require('./featureSignalRegistry');
 function assess(product) {
   const fired = registry.evaluate(product).filter((f) => f.category === 'risk');
   const high = fired.filter((f) => f.severity === 'high').length;
   const warn = fired.filter((f) => f.severity === 'warn').length;
   let riskLevel = 'low';
   if (high >= 3) riskLevel = 'critical';
   else if (high >= 1) riskLevel = 'high';
   else if (warn >= 1) riskLevel = 'medium';
   return { riskLevel, reasons: fired.map((f) => f.name), highCount: high, warnCount: warn };
 }
 function portfolio(products) {
   const counts = { low: 0, medium: 0, high: 0, critical: 0 };
   (products || []).forEach((p) => { counts[assess(p).riskLevel]++; });
   return counts;

 }
 module.exports = { assess, portfolio };
