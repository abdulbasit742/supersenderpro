  'use strict';
  /**
   * routes/productBusinessIntelligenceRoutes.js — Product Business Intelligence API.
   * Preview-only / dry-run. No live payment, no live order update, no real stock
   * mutation, no external calls, no secrets, no full PII. Requires express.json() for POST.
   */
  const express = require('express');
  const router = express.Router();

  const store = require('../lib/productBusinessIntelligence/store');
  const model = require('../lib/productBusinessIntelligence/productModel');
  const inventoryAnalyzer = require('../lib/productBusinessIntelligence/inventoryAnalyzer');
  const profitLossAnalyzer = require('../lib/productBusinessIntelligence/profitLossAnalyzer');
  const revenueAnalyzer = require('../lib/productBusinessIntelligence/revenueAnalyzer');
  const marginCalculator = require('../lib/productBusinessIntelligence/marginCalculator');
  const stockHealth = require('../lib/productBusinessIntelligence/stockHealth');
  const reorderAdvisor = require('../lib/productBusinessIntelligence/reorderAdvisor');
  const deadStockDetector = require('../lib/productBusinessIntelligence/deadStockDetector');
  const fastMoverDetector = require('../lib/productBusinessIntelligence/fastMoverDetector');
  const lossLeakageDetector = require('../lib/productBusinessIntelligence/lossLeakageDetector');
  const businessRiskEngine = require('../lib/productBusinessIntelligence/businessRiskEngine');
  const productScore = require('../lib/productBusinessIntelligence/productScore');
  const registry = require('../lib/productBusinessIntelligence/featureSignalRegistry');
  const insightGenerator = require('../lib/productBusinessIntelligence/insightGenerator');

  function wrap(h) { return function (req, res) { try { h(req, res); } catch (e) { res.status(500).json({ ok: false, error:
  'internal_error' }); } }; }
  function ensureSeeded() { if (store.all().length === 0) store.bulkPut(model.seeds()); }

  function analyzeProduct(p) {
    const inv = inventoryAnalyzer.analyze(p);
    const pl = profitLossAnalyzer.analyze(p);
    const sh = stockHealth.score(p);
    const ps = productScore.score(p);
    const risk = businessRiskEngine.assess(p);
    const fired = registry.evaluate(p);
    return {
      ok: true, dryRun: true, productId: p.id,
      inventoryHealth: sh.label,
      revenuePreview: pl.revenuePreview, profitPreview: pl.profitPreview, lossPreview: pl.lossPreview,
      marginPreview: pl.marginPreview, stockStatus: inv.stockStatus,
      businessScore: ps.businessScore, riskLevel: risk.riskLevel,

     signals: fired, recommendations: insightGenerator.forProduct(p, fired),
     warnings: [], blockers: [],
   };
}

router.get('/status', wrap(function (req, res) {
 ensureSeeded();
 res.json({ ok: true, module: 'product-business-intelligence', dryRun: true, liveActionsEnabled: false, noStockMutation:
true, noPaymentAction: true, externalCalls: false, totalProducts: store.all().length, registeredSignals:
registry.count(), categories: registry.categories().length, warnings: [], blockers: [], timestamp: new
Date().toISOString() });
}));

router.get('/products', wrap(function (req, res) { ensureSeeded(); res.json({ ok: true, dryRun: true, products:
store.all() }); }));
router.get('/products/:id', wrap(function (req, res) { ensureSeeded(); const p = store.get(req.params.id); return p ?
res.json({ ok: true, dryRun: true, product: p }) : res.status(404).json({ ok: false, error: 'not_found' }); }));

router.get('/summary', wrap(function (req, res) {
   ensureSeeded();
   const list = store.all();
   const sum = (f) => list.reduce((a, p) => a + f(p), 0);
   const revenue = sum((p) => (Number(p.salePrice) || 0) * (Number(p.soldQtyPreview) || 0));
   const cost = sum((p) => (Number(p.costPrice) || 0) * (Number(p.soldQtyPreview) || 0));
   const stockValue = sum((p) => (Number(p.stockQty) || 0) * (Number(p.costPrice) || 0));
   const profit = revenue - cost;
   const margins = list.map((p) => (p.salePrice > 0 ? Math.round(((p.salePrice - p.costPrice) / p.salePrice) * 100) : 0));
   const riskCounts = businessRiskEngine.portfolio(list);
   res.json({
     ok: true, dryRun: true, liveActionsEnabled: false,
     totalProducts: list.length,
     totalStockValuePreview: stockValue,
     totalRevenuePreview: revenue,
     totalCostPreview: cost,
     totalProfitPreview: profit > 0 ? profit : 0,
     totalLossPreview: profit < 0 ? Math.abs(profit) : 0,
     avgMarginPreview: margins.length ? Math.round(margins.reduce((a, b) => a + b, 0) / margins.length) : 0,
     lowStockCount: list.filter((p) => inventoryAnalyzer.analyze(p).stockStatus === 'low_stock').length,
     deadStockCount: deadStockDetector.detect(list).length,
     riskCount: riskCounts.high + riskCounts.critical,
     warnings: [], blockers: [],
 });
}));


router.get('/inventory', wrap(function (req, res) { ensureSeeded(); res.json({ ok: true, dryRun: true, inventory:
store.all().map((p) => Object.assign({ id: p.id, name: p.name }, stockHealth.score(p))) }); }));
router.get('/revenue', wrap(function (req, res) { ensureSeeded(); res.json({ ok: true, dryRun: true, ranking:
revenueAnalyzer.rank(store.all()) }); }));
router.get('/profit-loss', wrap(function (req, res) { ensureSeeded(); res.json({ ok: true, dryRun: true, products:
store.all().map((p) => Object.assign({ id: p.id, name: p.name }, profitLossAnalyzer.analyze(p))) }); }));
router.get('/margins', wrap(function (req, res) { ensureSeeded(); res.json({ ok: true, dryRun: true, margins:
store.all().map((p) => Object.assign({ id: p.id, name: p.name }, marginCalculator.assess(p))) }); }));
router.get('/stock-health', wrap(function (req, res) { ensureSeeded(); res.json({ ok: true, dryRun: true, stockHealth:
store.all().map((p) => Object.assign({ id: p.id, name: p.name }, stockHealth.score(p))) }); }));
router.get('/reorder-advice', wrap(function (req, res) { ensureSeeded(); res.json({ ok: true, dryRun: true, advice:
store.all().map((p) => reorderAdvisor.advise(p)).filter((a) => a.suggestedReorderQty > 0) }); }));
router.get('/dead-stock', wrap(function (req, res) { ensureSeeded(); res.json({ ok: true, dryRun: true, deadStock:

deadStockDetector.detect(store.all()) }); }));
router.get('/fast-movers', wrap(function (req, res) { ensureSeeded(); res.json({ ok: true, dryRun: true, fastMovers:
fastMoverDetector.detect(store.all()) }); }));
router.get('/loss-leakage', wrap(function (req, res) { ensureSeeded(); res.json(Object.assign({ ok: true, dryRun: true },
lossLeakageDetector.detect(store.all()))); }));
router.get('/business-risks', wrap(function (req, res) { ensureSeeded(); res.json({ ok: true, dryRun: true, portfolio:
businessRiskEngine.portfolio(store.all()), products: store.all().map((p) => Object.assign({ id: p.id, name: p.name },
businessRiskEngine.assess(p))) }); }));

router.get('/signals', wrap(function (req, res) { res.json({ ok: true, dryRun: true, total: registry.count(), categories:
registry.categories(), signals: registry.list({ category: req.query.category }) }); }));


router.post('/products/:id/analyze-preview', wrap(function (req, res) { ensureSeeded(); const p =
store.get(req.params.id); if (!p) return res.status(404).json({ ok: false, error: 'not_found' });
res.json(analyzeProduct(p)); }));
router.post('/analyze-all-preview', wrap(function (req, res) { ensureSeeded(); res.json({ ok: true, dryRun: true,
results: store.all().map(analyzeProduct) }); }));


router.post('/reorder-preview', wrap(function (req, res) { ensureSeeded(); const p = store.get((req.body &&
req.body.productId) || ''); if (!p) return res.status(404).json({ ok: false, error: 'not_found' });
res.json(reorderAdvisor.advise(p)); }));


router.post('/price-check-preview', wrap(function (req, res) {
 ensureSeeded();
 const p = store.get((req.body && req.body.productId) || '');
 if (!p) return res.status(404).json({ ok: false, error: 'not_found' });
 const m = marginCalculator.assess(p);
 res.json({ ok: true, dryRun: true, productId: p.id, currentPrice: p.salePrice, costPrice: p.costPrice, marginPreview:
m.marginPreview, suggestedPricePreview: m.suggestedPricePreview, warnings: m.warnings, blockers: [] });
}));


router.post('/forecast-preview', wrap(function (req, res) {
 ensureSeeded();
 const p = store.get((req.body && req.body.productId) || '');
 if (!p) return res.status(404).json({ ok: false, error: 'not_found' });
 const sold = Number(p.soldQtyPreview) || 0;
 const monthly = Math.round(sold);
 res.json({ ok: true, dryRun: true, productId: p.id, basis: 'soldQtyPreview', next30DaysUnitsPreview: monthly,
next30DaysRevenuePreview: monthly * (Number(p.salePrice) || 0), note: 'Illustrative preview only.', warnings: [],
blockers: [] });
}));


module.exports = router;
