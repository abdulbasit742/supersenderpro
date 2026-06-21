 'use strict';
 /**
  * tests/smoke/productBusinessIntelligenceSmoke.js — module-level smoke. No server,
  * no network, no stock mutation. Verifies analyzers, registry, scoring, masking.
  */
 const path = require('path');
 const assert = require('assert');
 const ROOT = process.cwd();
 const R = (p) => require(path.join(ROOT, p));


 function main() {
   const results = [];
   const ok = (name, fn) => { try { fn(); results.push({ name, status: 'pass' }); } catch (e) { results.push({ name,
 status: 'fail', error: e.message }); } };

   const model = R('lib/productBusinessIntelligence/productModel.js');
   const registry = R('lib/productBusinessIntelligence/featureSignalRegistry.js');
   const inventoryAnalyzer = R('lib/productBusinessIntelligence/inventoryAnalyzer.js');
   const profitLossAnalyzer = R('lib/productBusinessIntelligence/profitLossAnalyzer.js');
   const marginCalculator = R('lib/productBusinessIntelligence/marginCalculator.js');
   const deadStockDetector = R('lib/productBusinessIntelligence/deadStockDetector.js');
   const fastMoverDetector = R('lib/productBusinessIntelligence/fastMoverDetector.js');
   const businessRiskEngine = R('lib/productBusinessIntelligence/businessRiskEngine.js');
   const redactor = R('lib/productBusinessIntelligence/redactor.js');
   R('routes/productBusinessIntelligenceRoutes.js');

     ok('registry has 20 categories + 60+ signals', () => { assert.ok(registry.categories().length >= 20);
 assert.ok(registry.count() >= 60); });
   ok('registry is extensible (register adds)', () => { const before = registry.count(); registry.def('custom_x',
 'dashboard', 'custom_x', 'test', 'info', () => true); assert.strictEqual(registry.count(), before + 1); });
   ok('out of stock detected', () => { assert.strictEqual(inventoryAnalyzer.analyze(model.newProduct({ stockQty: 0
 })).stockStatus, 'out_of_stock'); });
   ok('dead stock detected', () => { const d = deadStockDetector.detect([model.newProduct({ stockQty: 50,
 daysSinceLastSale: 120 })]); assert.strictEqual(d.length, 1); });
   ok('fast mover detected', () => { const f = fastMoverDetector.detect([model.newProduct({ soldQtyPreview: 150,
 salePrice: 100 })]); assert.strictEqual(f.length, 1); });
   ok('loss detected on below-cost sale', () => { const pl = profitLossAnalyzer.analyze(model.newProduct({ costPrice: 100,
 salePrice: 80, soldQtyPreview: 10 })); assert.ok(pl.signals.includes('price_below_cost')); });
   ok('margin calc suggests price above cost', () => { assert.ok(marginCalculator.suggestedPrice(100, 35) > 100); });
   ok('risk engine returns valid level', () => { const r = businessRiskEngine.assess(model.newProduct({ costPrice: 100,
 salePrice: 80, soldQtyPreview: 100 })); assert.ok(model.RISK_LEVELS.includes(r.riskLevel)); });
   ok('business score within 0..100', () => { const s =
 R('lib/productBusinessIntelligence/productScore.js').score(model.newProduct({ costPrice: 50, salePrice: 200,
 soldQtyPreview: 80, stockQty: 40 })); assert.ok(s.businessScore >= 0 && s.businessScore <= 100); });
   ok('supplier masked in redactor', () => { assert.ok(/supplier/.test(redactor.maskSupplier('CloudVendorA')));
 assert.ok(!/CloudVendorA/.test(redactor.maskSupplier('CloudVendorA'))); });
   ok('product model forces dryRun true', () => { assert.strictEqual(model.newProduct({ dryRun: false }).dryRun, true);
 });

     const passed = results.filter((r) => r.status === 'pass').length;
     const failed = results.filter((r) => r.status === 'fail').length;
     console.log('[product-bi:smoke] passed=%d failed=%d', passed, failed);
     results.filter((r) => r.status === 'fail').forEach((r) => console.log('   FAIL', r.name, '-', r.error));
     process.exit(failed === 0 ? 0 : 1);
 }
 main();
