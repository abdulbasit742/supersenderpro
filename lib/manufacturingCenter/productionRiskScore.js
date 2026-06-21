  'use strict';
  /**
      * productionRiskScore.js — maps BOM + order conditions to risk signals + level.
      * Pure. Reusable across orders. Reads supplier-delay context if supplied.
   */
  const materialRequirement = require('./materialRequirement');
  const profitMarginPreview = require('./profitMarginPreview');

  function assess(bom, order, ctx) {
    const c = ctx || {};
       const signals = [];
       const qty = Number(order && order.quantityToProduce) || 1;

       const mat = materialRequirement.check(bom, qty, c.stockMap);
       if (mat.shortagesPreview.length) signals.push('raw_material_shortage');
       if ((bom.components || []).some((x) => x.unitCostPreview === 0 && ['raw_material',
  'semi_finished_good'].includes(x.componentType))) signals.push('component_missing');


       const pm = profitMarginPreview.preview(bom, qty, c.salePricePerUnit);
       if (pm.warnings.includes('cost_above_sale_price')) signals.push('cost_above_sale_price');
       if (pm.marginPreview < 10) signals.push('margin_too_low');


       if (bom.wastagePercentPreview > 10) signals.push('wastage_high');
       if (bom.laborCostPreview > bom.materialCostPreview) signals.push('labor_cost_high');
       if (bom.overheadCostPreview > bom.materialCostPreview) signals.push('overhead_high');
       if (c.supplierDelayRisk) signals.push('supplier_delay_risk');
       if (!order || !order.productionLocationId) signals.push('production_location_missing');
       if (c.approvalRequired) signals.push('approval_required');
       if (!c.accountingMapped) signals.push('accounting_mapping_missing');

    const high = ['raw_material_shortage', 'component_missing', 'cost_above_sale_price'].filter((s) =>
  signals.includes(s)).length;
       let riskLevel = 'low';
       if (high >= 2) riskLevel = 'critical';
       else if (high >= 1) riskLevel = 'high';
       else if (signals.length >= 2) riskLevel = 'medium';
       return { riskLevel, signals };
  }
  module.exports = { assess };
