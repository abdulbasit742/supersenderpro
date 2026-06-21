  'use strict';
  /**
   * inventoryImpactPreview.js — previews raw-material consumption and finished-goods
   * addition for a production run. NEVER mutates stock.
   */
  const productionCosting = require('./productionCosting');
  function preview(bom, quantityToProduce) {
    const qty = Number(quantityToProduce) || 1;
    const rawMaterialStockImpactPreview = (bom.components || [])
      .filter((c) => ['raw_material', 'semi_finished_good', 'packaging_material',

  'consumable_preview'].includes(c.componentType))
      .map((c) => ({ productId: c.productId, productName: c.productName, consumedQtyPreview: c.quantityRequired * qty,
  stockChangePreview: -(c.quantityRequired * qty) }));
    const finishedGoodsStockImpactPreview = [{ productId: bom.finishedProductId, productName: bom.finishedProductName,
  addedQtyPreview: qty, stockChangePreview: qty }];
      const cost = productionCosting.compute(bom, qty);
      const rawValueOut = rawMaterialStockImpactPreview.reduce((a, r) => {
        const comp = (bom.components || []).find((c) => c.productId === r.productId);
        return a + (comp ? comp.unitCostPreview * (r.consumedQtyPreview) : 0);
      }, 0);
      const finishedValueIn = cost.totalProductionCostPreview; // value at production cost
      return {
        ok: true, dryRun: true, liveStockMutation: false,
        rawMaterialStockImpactPreview,
        finishedGoodsStockImpactPreview,
        stockValueChangePreview: Math.round((finishedValueIn - rawValueOut) * 100) / 100,
        warnings: [], blockers: [],
      };
  }
  module.exports = { preview };
