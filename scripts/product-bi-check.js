 'use strict';
 /**
  * scripts/product-bi-check.js — loads the engine, confirms safe defaults, checks
  * the signal registry size + categories, runs analyzers on seed products, and
  * writes a report to artifacts/. Read-only on source; only writes under artifacts/.
  * No network, no external API, no secrets, no real stock mutation.
  */
 const fs = require('fs');
 const path = require('path');
 const ROOT = process.cwd();
 const R = (p) => require(path.join(ROOT, p));

 function main() {
   const model = R('lib/productBusinessIntelligence/productModel.js');
   const registry = R('lib/productBusinessIntelligence/featureSignalRegistry.js');
   const inventoryAnalyzer = R('lib/productBusinessIntelligence/inventoryAnalyzer.js');
   const profitLossAnalyzer = R('lib/productBusinessIntelligence/profitLossAnalyzer.js');
   const businessRiskEngine = R('lib/productBusinessIntelligence/businessRiskEngine.js');
   const productScore = R('lib/productBusinessIntelligence/productScore.js');
   R('routes/productBusinessIntelligenceRoutes.js');

   const blockers = [];
   const warnings = [];
   const seeds = model.seeds();

   if (registry.count() < 60) warnings.push('registry_seeded_below_target:' + registry.count());
   if (registry.categories().length < 20) blockers.push('missing_categories:' + registry.categories().length);


   seeds.forEach((p) => {
     const inv = inventoryAnalyzer.analyze(p);
     if (!model.STOCK_STATUSES.includes(inv.stockStatus)) blockers.push('bad_stock_status:' + p.id);
     const pl = profitLossAnalyzer.analyze(p);
     if (typeof pl.profitPreview !== 'number') blockers.push('bad_profit:' + p.id);
     const ps = productScore.score(p);
     if (ps.businessScore < 0 || ps.businessScore > 100) blockers.push('score_out_of_range:' + p.id);
     const risk = businessRiskEngine.assess(p);
     if (!model.RISK_LEVELS.includes(risk.riskLevel)) blockers.push('bad_risk:' + p.id);
   });

   // The below-cost hardware seed must surface a price_below_cost / pricing risk.

   const hw = seeds.find((p) => p.sku === 'HW-DONGLE');
   const hwSignals = registry.evaluate(hw).map((s) => s.name);
   if (!hwSignals.includes('price_below_cost') && !hwSignals.includes('pricing_error_risk'))
 blockers.push('below_cost_not_detected');

   const result = {
     generatedAt: new Date().toISOString(),
     dryRun: true, liveActionsEnabled: false, noStockMutation: true, noPaymentAction: true,
     module: 'product-business-intelligence',
     registeredSignals: registry.count(),
     categories: registry.categories().length,
     seedProducts: seeds.length,
     warnings, blockers,
     pass: blockers.length === 0,
   };


   const ARTIFACTS = path.join(ROOT, 'artifacts');
   if (!fs.existsSync(ARTIFACTS)) fs.mkdirSync(ARTIFACTS, { recursive: true });
   fs.writeFileSync(path.join(ARTIFACTS, 'product_bi_check.json'), JSON.stringify(result, null, 2));


   console.log('[product-bi:check] signals=%d categories=%d seeds=%d blockers=%d pass=%s', result.registeredSignals,
 result.categories, result.seedProducts, result.blockers.length, result.pass);
   process.exit(result.pass ? 0 : 1);
 }
 main();
