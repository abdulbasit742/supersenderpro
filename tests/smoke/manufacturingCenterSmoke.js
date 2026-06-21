  'use strict';
  /**
   * tests/smoke/manufacturingCenterSmoke.js — module-level smoke. No server, no
   * network, no stock mutation. Verifies BOM costing, material check, costing,
   * inventory + accounting impact, risk, masking.
   */
  const path = require('path');
  const assert = require('assert');
  const ROOT = process.cwd();
  const R = (p) => require(path.join(ROOT, p));


  function main() {
    const results = [];
    const ok = (name, fn) => { try { fn(); results.push({ name, status: 'pass' }); } catch (e) { results.push({ name,
  status: 'fail', error: e.message }); } };

    const bomModel = R('lib/manufacturingCenter/bomModel.js');
    const orderModel = R('lib/manufacturingCenter/productionOrderModel.js');
    const materialRequirement = R('lib/manufacturingCenter/materialRequirement.js');
    const productionCosting = R('lib/manufacturingCenter/productionCosting.js');
    const wastagePreview = R('lib/manufacturingCenter/wastagePreview.js');
    const batchProductionPreview = R('lib/manufacturingCenter/batchProductionPreview.js');
    const inventoryImpactPreview = R('lib/manufacturingCenter/inventoryImpactPreview.js');
    const profitMarginPreview = R('lib/manufacturingCenter/profitMarginPreview.js');

    const productionRiskScore = R('lib/manufacturingCenter/productionRiskScore.js');
    const accountingImpactPreview = R('lib/manufacturingCenter/accountingImpactPreview.js');
    const redactor = R('lib/manufacturingCenter/redactor.js');
    R('routes/manufacturingCenterRoutes.js');


    ok('bom model forces dryRun true', () => assert.strictEqual(bomModel.newBom({ dryRun: false }).dryRun, true));
    ok('bom rolls up material cost from components', () => { const b = bomModel.newBom({ components: [{ componentType:
  'raw_material', quantityRequired: 2, unitCostPreview: 100, availableStockPreview: 10 }] });
  assert.strictEqual(b.materialCostPreview, 200); });
    ok('component flags shortage', () => { const c = bomModel.component({ componentType: 'raw_material', quantityRequired:
  10, unitCostPreview: 5, availableStockPreview: 4 }); assert.strictEqual(c.shortagePreview, 6);
  assert.ok(c.warnings.includes('shortage')); });
    ok('material check detects shortage at scale', () => { const b = bomModel.seeds().find((x) => x.finishedSku === 'FG-COMBO'); const m = materialRequirement.check(b, 10); assert.ok(m.shortagesPreview.length >= 1);
  assert.strictEqual(m.liveStockMutation, false); });
    ok('costing scales with quantity', () => { const b = bomModel.seeds()[0]; const c1 = productionCosting.compute(b, 1);
  const c10 = productionCosting.compute(b, 10); assert.ok(c10.totalProductionCostPreview > c1.totalProductionCostPreview);
  });
    ok('wastage high flag over 10%', () => { assert.ok(wastagePreview.preview(1000, 12,
  1).warnings.includes('wastage_high')); });
    ok('batch splits quantity', () => { const b = bomModel.seeds()[0]; const r = batchProductionPreview.preview(b, 10, 4);
  assert.strictEqual(r.batchesPreview, 3); });
    ok('inventory impact is dry-run, consumes raw + adds finished', () => { const b = bomModel.seeds()[0]; const r =
  inventoryImpactPreview.preview(b, 5); assert.strictEqual(r.liveStockMutation, false);
  assert.ok(r.rawMaterialStockImpactPreview.length >= 1);
  assert.strictEqual(r.finishedGoodsStockImpactPreview[0].addedQtyPreview, 5); });
    ok('profit margin flags cost above sale', () => { const b = bomModel.newBom({ components: [{ componentType:
  'raw_material', quantityRequired: 1, unitCostPreview: 1000, availableStockPreview: 10 }], suggestedSalePricePreview: 500
  }); const r = profitMarginPreview.preview(b, 1, 500); assert.ok(r.warnings.includes('cost_above_sale_price')); });
    ok('risk returns valid level + signals', () => { const b = bomModel.seeds().find((x) => x.finishedSku === 'FG-COMBO');
  const risk = productionRiskScore.assess(b, orderModel.newOrder({ bomId: b.id, quantityToProduce: 10 }), {});
  assert.ok(orderModel.RISK_LEVELS.includes(risk.riskLevel)); assert.ok(risk.signals.includes('raw_material_shortage'));
  });
    ok('accounting impact balanced + no live write', () => { const b = bomModel.seeds()[0]; const a =
  accountingImpactPreview.preview(b, 10); assert.strictEqual(a.liveLedgerWrite, false); const deb =
  a.ledgerEntriesPreview.reduce((x, e) => x + e.debit, 0); const cred = a.ledgerEntriesPreview.reduce((x, e) => x +
  e.credit, 0); assert.strictEqual(Math.round(deb * 100), Math.round(cred * 100)); });
    ok('redactor masks supplier name', () => { assert.ok(/supplier/.test(redactor.maskName('CloudVendorA')) === false);
  assert.ok(/\*/.test(redactor.maskName('CloudVendorA'))); });


    const passed = results.filter((r) => r.status === 'pass').length;
    const failed = results.filter((r) => r.status === 'fail').length;
    console.log('[manufacturing-center:smoke] passed=%d failed=%d', passed, failed);
    results.filter((r) => r.status === 'fail').forEach((r) => console.log('   FAIL', r.name, '-', r.error));
    process.exit(failed === 0 ? 0 : 1);
  }
  main();
