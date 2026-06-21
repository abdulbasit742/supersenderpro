  'use strict';
  /**
   * profitMarginPreview.js — production profit/margin preview vs sale price. Pure.
   */
  const productionCosting = require('./productionCosting');
  function preview(bom, quantityToProduce, salePricePerUnit) {
    const qty = Number(quantityToProduce) || 1;
      const cost = productionCosting.compute(bom, qty);
      const sale = Number(salePricePerUnit != null ? salePricePerUnit : bom.suggestedSalePricePreview) || 0;
      const revenuePreview = Math.round(sale * qty * 100) / 100;
      const profitPreview = Math.round((revenuePreview - cost.totalProductionCostPreview) * 100) / 100;
      const marginPreview = revenuePreview > 0 ? Math.round((profitPreview / revenuePreview) * 100) : 0;
      const warnings = [];
      if (cost.unitCostPreview > sale && sale > 0) warnings.push('cost_above_sale_price');
      if (marginPreview < 10) warnings.push('margin_too_low');
    return { ok: true, dryRun: true, unitCostPreview: cost.unitCostPreview, salePricePreview: sale, revenuePreview,
  totalProductionCostPreview: cost.totalProductionCostPreview, profitPreview, marginPreview, warnings, blockers: [] };
  }
  module.exports = { preview };
