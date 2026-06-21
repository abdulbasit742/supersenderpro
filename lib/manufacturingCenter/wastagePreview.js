  'use strict';
  /**
   * wastagePreview.js — wastage/scrap preview given a base cost + wastage %.
   */
  function preview(baseCost, wastagePercent, quantityToProduce) {
    const base = Number(baseCost) || 0;
    const pct = Number(wastagePercent) || 0;
    const qty = Number(quantityToProduce) || 1;
    const wastageCostPreview = Math.round(base * (pct / 100) * 100) / 100;
    const warnings = [];
    if (pct > 10) warnings.push('wastage_high');
    return { ok: true, dryRun: true, wastagePercentPreview: pct, perUnitWastageCostPreview: wastageCostPreview,
  totalWastageCostPreview: Math.round(wastageCostPreview * qty * 100) / 100, warnings };
  }
  module.exports = { preview };
