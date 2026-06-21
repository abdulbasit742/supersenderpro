  'use strict';
  /**
   * productionCosting.js — computes production cost for a BOM x quantity, including
      * material, labor, overhead, wastage. Pure. Preview-only.
      */
  function round2(n) { return Math.round((Number(n) || 0) * 100) / 100; }
  function compute(bom, quantityToProduce) {
       const qty = Number(quantityToProduce) || 1;
       const materialCostPreview = round2(bom.materialCostPreview * qty);
       const laborCostPreview = round2(bom.laborCostPreview * qty);
       const overheadCostPreview = round2(bom.overheadCostPreview * qty);
       const base = materialCostPreview + laborCostPreview + overheadCostPreview;

    const wastageCostPreview = round2(base * (bom.wastagePercentPreview / 100));
    const totalProductionCostPreview = round2(base + wastageCostPreview);
    const finishedGoodsValuePreview = round2(bom.suggestedSalePricePreview * qty);
    const unitCostPreview = qty > 0 ? round2(totalProductionCostPreview / qty) : 0;
    return { materialCostPreview, laborCostPreview, overheadCostPreview, wastageCostPreview, totalProductionCostPreview,
  finishedGoodsValuePreview, unitCostPreview };
  }
  module.exports = { compute, round2 };
