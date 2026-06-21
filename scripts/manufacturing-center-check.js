  'use strict';
  /**
   * scripts/manufacturing-center-check.js — loads the manufacturing layer, confirms
   * safe defaults, exercises BOM cost + material check + costing + risk on seeds,
   * writes a report to artifacts/. Read-only on source; only writes under artifacts/.
   * No network, no stock mutation, no ledger write, no secrets printed.
   */
  const fs = require('fs');
  const path = require('path');
  const ROOT = process.cwd();
  const R = (p) => require(path.join(ROOT, p));

  function main() {
    const bomModel = R('lib/manufacturingCenter/bomModel.js');
    const orderModel = R('lib/manufacturingCenter/productionOrderModel.js');
    const materialRequirement = R('lib/manufacturingCenter/materialRequirement.js');
    const productionCosting = R('lib/manufacturingCenter/productionCosting.js');
    const inventoryImpactPreview = R('lib/manufacturingCenter/inventoryImpactPreview.js');
    const accountingImpactPreview = R('lib/manufacturingCenter/accountingImpactPreview.js');
    const productionRiskScore = R('lib/manufacturingCenter/productionRiskScore.js');
    R('routes/manufacturingCenterRoutes.js');

    const boms = bomModel.seeds();
    const blockers = [];
    const warnings = [];

    const bom = boms[0];
    // material check on the Combo (cable x2, only 4 in stock) at qty 10 -> shortage expected
    const combo = boms.find((b) => b.finishedSku === 'FG-COMBO');
    const mat = materialRequirement.check(combo, 10);
    if (mat.shortagesPreview.length < 1) blockers.push('shortage_not_detected');
    if (mat.liveStockMutation !== false) blockers.push('material_check_not_dry_run');

    const cost = productionCosting.compute(bom, 10);
    if (typeof cost.totalProductionCostPreview !== 'number') blockers.push('bad_cost');

    const inv = inventoryImpactPreview.preview(bom, 10);
    if (inv.liveStockMutation !== false) blockers.push('inventory_not_dry_run');

    const acc = accountingImpactPreview.preview(bom, 10);

    if (acc.liveLedgerWrite !== false) blockers.push('ledger_write_not_blocked');
    const deb = acc.ledgerEntriesPreview.reduce((a, e) => a + e.debit, 0);
    const cred = acc.ledgerEntriesPreview.reduce((a, e) => a + e.credit, 0);
    if (Math.round(deb * 100) !== Math.round(cred * 100)) blockers.push('ledger_not_balanced');

    const risk = productionRiskScore.assess(combo, orderModel.newOrder({ bomId: combo.id, quantityToProduce: 10 }), {});
    if (!orderModel.RISK_LEVELS.includes(risk.riskLevel)) blockers.push('bad_risk_level');

    const result = {
      generatedAt: new Date().toISOString(),
      dryRun: true, liveActionsEnabled: false, noStockMutation: true, noProductionCompletion: true, noLedgerWrite: true,
      module: 'manufacturing-center',
      boms: boms.length,
      sampleShortages: mat.shortagesPreview.length,
      warnings, blockers,
      pass: blockers.length === 0,
    };

    const ARTIFACTS = path.join(ROOT, 'artifacts');
    if (!fs.existsSync(ARTIFACTS)) fs.mkdirSync(ARTIFACTS, { recursive: true });
    fs.writeFileSync(path.join(ARTIFACTS, 'manufacturing_center_check.json'), JSON.stringify(result, null, 2));

    console.log('[manufacturing-center:check] boms=%d shortages=%d blockers=%d pass=%s', result.boms,
  result.sampleShortages, result.blockers.length, result.pass);
    process.exit(result.pass ? 0 : 1);
  }
  main();
