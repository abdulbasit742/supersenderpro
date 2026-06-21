  'use strict';
  /**
   * accountingImpactPreview.js — preview double-entry ledger impact of a production
      * run (WIP/finished goods vs raw materials + wastage expense). Bridges read-only
      * to Accounting Center if present. NEVER writes to the ledger.
   */
  const productionCosting = require('./productionCosting');
  function preview(bom, quantityToProduce) {
    const qty = Number(quantityToProduce) || 1;
       const cost = productionCosting.compute(bom, qty);
       let target = 'standalone_preview';
       try { const ac = require('../accountingCenter'); if (ac) target = 'accounting_center_detected'; } catch (e) {}
       const ledgerEntriesPreview = [
         { account: 'Finished Goods Inventory', debit: cost.totalProductionCostPreview, credit: 0 },
         { account: 'Raw Materials Inventory', debit: 0, credit: cost.materialCostPreview },
         { account: 'Labor + Overhead Applied', debit: 0, credit: cost.laborCostPreview + cost.overheadCostPreview },
         { account: 'Wastage Expense', debit: cost.wastageCostPreview, credit: 0 },
         { account: 'Wastage Offset', debit: 0, credit: cost.wastageCostPreview },
       ];

   return {
     ok: true, dryRun: true, liveLedgerWrite: false,
     target,
     productionCostPreview: cost.totalProductionCostPreview,
     inventoryValueChangePreview: Math.round((cost.totalProductionCostPreview - cost.materialCostPreview) * 100) / 100,
     wastageExpensePreview: cost.wastageCostPreview,
     ledgerEntriesPreview,
     warnings: target === 'standalone_preview' ? ['accounting_center_not_detected_preview_only'] : [],
     blockers: [],
   };
}
module.exports = { preview };
