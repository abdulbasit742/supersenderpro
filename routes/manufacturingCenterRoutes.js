  'use strict';
  /**
   * routes/manufacturingCenterRoutes.js — Manufacturing + BOM + Production Costing API.
   * Preview-only / dry-run. No real stock mutation, no production completion, no
   * purchase order, no ledger write, no payment, no external calls, no secrets, no
   * full PII. express.json() for POST/PUT.
   */
  const express = require('express');
  const router = express.Router();


  const store = require('../lib/manufacturingCenter/store');
  const bomService = require('../lib/manufacturingCenter/bomService');
  const bomModel = require('../lib/manufacturingCenter/bomModel');
  const orderModel = require('../lib/manufacturingCenter/productionOrderModel');
  const materialRequirement = require('../lib/manufacturingCenter/materialRequirement');
  const productionCosting = require('../lib/manufacturingCenter/productionCosting');
  const wastagePreview = require('../lib/manufacturingCenter/wastagePreview');
  const batchProductionPreview = require('../lib/manufacturingCenter/batchProductionPreview');
  const inventoryImpactPreview = require('../lib/manufacturingCenter/inventoryImpactPreview');
  const profitMarginPreview = require('../lib/manufacturingCenter/profitMarginPreview');
  const productionRiskScore = require('../lib/manufacturingCenter/productionRiskScore');
  const accountingImpactPreview = require('../lib/manufacturingCenter/accountingImpactPreview');

  function wrap(h) { return function (req, res) { try { h(req, res); } catch (e) { res.status(500).json({ ok: false, error:
  'internal_error' }); } }; }
  function ensureSeeded() { bomService.ensureSeeded(); if (store.allOrders().length === 0)
  store.bulkPutOrders(orderModel.seeds()); }
  function bomOr404(id, res) { const b = bomService.get(id); if (!b) res.status(404).json({ ok: false, error:
  'bom_not_found' }); return b; }

  router.get('/status', wrap(function (req, res) {
    ensureSeeded();
    res.json({ ok: true, module: 'manufacturing-center', dryRun: true, liveActionsEnabled: false, noStockMutation: true,
  noProductionCompletion: true, noLedgerWrite: true, externalCalls: false, boms: bomService.list().length,
  productionOrders: store.allOrders().length, warnings: [], blockers: [], timestamp: new Date().toISOString() });
  }));

  // BOMs
  router.get('/boms', wrap(function (req, res) { res.json({ ok: true, dryRun: true, boms: bomService.list(req.query) });
  }));
  router.post('/boms', wrap(function (req, res) { res.json(bomService.create(req.body || {})); }));
  router.get('/boms/:id', wrap(function (req, res) { const b = bomOr404(req.params.id, res); if (b) res.json({ ok: true,

dryRun: true, bom: b }); }));
router.put('/boms/:id', wrap(function (req, res) { const r = bomService.update(req.params.id, req.body || {}); return
r.ok ? res.json(r) : res.status(404).json({ ok: false, errors: r.errors }); }));
router.post('/boms/:id/cost-preview', wrap(function (req, res) { const r = bomService.costPreview(req.params.id); return
r.ok ? res.json(r) : res.status(404).json(r); }));
router.post('/boms/:id/material-check-preview', wrap(function (req, res) { const b = bomOr404(req.params.id, res); if
(!b) return; const qty = (req.body && req.body.quantityToProduce) || 1; res.json(materialRequirement.check(b, qty,
req.body && req.body.stockMap)); }));

// Production orders
router.get('/production-orders', wrap(function (req, res) { ensureSeeded(); const f = req.query || {}; res.json({ ok:
true, dryRun: true, orders: store.allOrders().filter((o) => (!f.status || o.status === f.status) && (!f.riskLevel ||
o.riskLevel === f.riskLevel) && (!f.productionLocationId || o.productionLocationId === f.productionLocationId)) }); }));
router.post('/production-orders', wrap(function (req, res) { const o = orderModel.newOrder(req.body || {});
store.putOrder(o); res.json({ ok: true, dryRun: true, order: o }); }));
router.get('/production-orders/:id', wrap(function (req, res) { ensureSeeded(); const o = store.getOrder(req.params.id);
return o ? res.json({ ok: true, dryRun: true, order: o }) : res.status(404).json({ ok: false, error: 'not_found' }); }));
router.put('/production-orders/:id', wrap(function (req, res) { ensureSeeded(); const cur =
store.getOrder(req.params.id); if (!cur) return res.status(404).json({ ok: false, error: 'not_found' }); const merged =
orderModel.newOrder(Object.assign({}, cur, req.body || {}, { id: cur.id, createdAt: cur.createdAt }));
store.putOrder(merged); res.json({ ok: true, dryRun: true, order: merged }); }));

router.post('/production-orders/:id/start-preview', wrap(function (req, res) {
 ensureSeeded();
 const o = store.getOrder(req.params.id); if (!o) return res.status(404).json({ ok: false, error: 'not_found' });
 const b = bomService.get(o.bomId); if (!b) return res.status(404).json({ ok: false, error: 'bom_not_found' });
 const mat = materialRequirement.check(b, o.quantityToProduce);
 const status = mat.shortagesPreview.length ? 'shortage_preview' : 'ready_preview';
 res.json({ ok: true, dryRun: true, liveProductionStart: false, productionOrderId: o.id, statusPreview: status,
material: mat, warnings: mat.warnings, blockers: [] });
}));

router.post('/production-orders/:id/complete-preview', wrap(function (req, res) {
 ensureSeeded();
 const o = store.getOrder(req.params.id); if (!o) return res.status(404).json({ ok: false, error: 'not_found' });
 const b = bomService.get(o.bomId); if (!b) return res.status(404).json({ ok: false, error: 'bom_not_found' });
 const qty = o.quantityToProduce;
 const inv = inventoryImpactPreview.preview(b, qty);
 res.json({
   ok: true, dryRun: true, liveProductionComplete: false, liveStockMutation: false,
   productionOrderId: o.id,
   finishedQtyPreview: qty,
   rawMaterialsConsumedPreview: inv.rawMaterialStockImpactPreview,
   finishedGoodsAddedPreview: inv.finishedGoodsStockImpactPreview,
   wastagePreview: wastagePreview.preview(b.materialCostPreview + b.laborCostPreview + b.overheadCostPreview,
b.wastagePercentPreview, qty),
   warnings: [], blockers: [],
 });
}));

// Stateless previews
function bomFromBody(body) { return body && body.bomId ? bomService.get(body.bomId) : (body && body.bom ?
bomModel.newBom(body.bom) : null); }
router.post('/material-requirement-preview', wrap(function (req, res) { const b = bomFromBody(req.body); if (!b) return
res.status(400).json({ ok: false, error: 'provide bomId or bom' }); res.json(Object.assign({ productionOrderId: (req.body
&& req.body.productionOrderId) || null }, materialRequirement.check(b, (req.body && req.body.quantityToProduce) || 1,
req.body && req.body.stockMap))); }));

router.post('/wastage-preview', wrap(function (req, res) { const b = req.body || {};
res.json(wastagePreview.preview(b.baseCost, b.wastagePercent, b.quantityToProduce)); }));
router.post('/batch-production-preview', wrap(function (req, res) { const b = bomFromBody(req.body); if (!b) return
res.status(400).json({ ok: false, error: 'provide bomId or bom' }); res.json(batchProductionPreview.preview(b, (req.body
&& req.body.quantityToProduce) || 1, req.body && req.body.batchSize)); }));
router.post('/inventory-impact-preview', wrap(function (req, res) { const b = bomFromBody(req.body); if (!b) return
res.status(400).json({ ok: false, error: 'provide bomId or bom' }); res.json(inventoryImpactPreview.preview(b, (req.body
&& req.body.quantityToProduce) || 1)); }));
router.post('/profit-margin-preview', wrap(function (req, res) { const b = bomFromBody(req.body); if (!b) return
res.status(400).json({ ok: false, error: 'provide bomId or bom' }); res.json(profitMarginPreview.preview(b, (req.body &&
req.body.quantityToProduce) || 1, req.body && req.body.salePricePerUnit)); }));
router.post('/accounting-impact-preview', wrap(function (req, res) { const b = bomFromBody(req.body); if (!b) return
res.status(400).json({ ok: false, error: 'provide bomId or bom' }); res.json(accountingImpactPreview.preview(b, (req.body
&& req.body.quantityToProduce) || 1)); }));


router.get('/risks', wrap(function (req, res) {
 ensureSeeded();
 const out = store.allOrders().map((o) => { const b = bomService.get(o.bomId); return Object.assign({ productionOrderId:
o.id, bomId: o.bomId }, b ? productionRiskScore.assess(b, o, {}) : { riskLevel: 'high', signals: ['component_missing']
}); });
 res.json({ ok: true, dryRun: true, risks: out });
}));

router.get('/summary', wrap(function (req, res) {
 ensureSeeded();
 const boms = bomService.list();
 const orders = store.allOrders();
 let shortageCount = 0; let prodCost = 0; let fgValue = 0; let highRisk = 0;
 orders.forEach((o) => { const b = bomService.get(o.bomId); if (!b) { highRisk++; return; } const mat =
materialRequirement.check(b, o.quantityToProduce); if (mat.shortagesPreview.length) shortageCount++; const cost =
productionCosting.compute(b, o.quantityToProduce); prodCost += cost.totalProductionCostPreview; fgValue +=
cost.finishedGoodsValuePreview; const risk = productionRiskScore.assess(b, o, {}); if (['high',
'critical'].includes(risk.riskLevel)) highRisk++; });
 res.json({ ok: true, dryRun: true, liveActionsEnabled: false, totalBomsPreview: boms.length,
totalProductionOrdersPreview: orders.length, materialShortageCountPreview: shortageCount, productionCostPreview:
Math.round(prodCost * 100) / 100, finishedGoodsValuePreview: Math.round(fgValue * 100) / 100, highRiskOrdersPreview:
highRisk, warnings: [], blockers: [] });
}));


module.exports = router;
