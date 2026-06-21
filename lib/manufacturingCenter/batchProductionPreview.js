  'use strict';
  /**
   * batchProductionPreview.js — splits a production qty into batches and previews
   * per-batch cost + output. Preview-only.
   */
  const productionCosting = require('./productionCosting');
  function preview(bom, quantityToProduce, batchSize) {
    const qty = Number(quantityToProduce) || 1;
    const size = Math.max(1, Number(batchSize) || qty);
    const batches = Math.ceil(qty / size);
    const perBatch = [];
    let remaining = qty;
    for (let b = 0; b < batches; b++) {
      const thisBatch = Math.min(size, remaining);
      remaining -= thisBatch;
      const cost = productionCosting.compute(bom, thisBatch);
      perBatch.push({ batch: b + 1, qtyPreview: thisBatch, totalProductionCostPreview: cost.totalProductionCostPreview,
  finishedGoodsValuePreview: cost.finishedGoodsValuePreview });
    }
    return { ok: true, dryRun: true, batchesPreview: batches, batchSizePreview: size, perBatchPreview: perBatch, warnings:
  [], blockers: [] };
  }
  module.exports = { preview };
