  'use strict';
  /**
   * bomModel.js — BOM + component shapes, enums, factory, synthetic seeds.
      * Pure data; no I/O. All money fields are *Preview.
      */
  const crypto = require('crypto');


  const COMPONENT_TYPES = ['raw_material', 'semi_finished_good', 'packaging_material', 'service_labor_preview',
  'overhead_preview', 'consumable_preview'];
  const BOM_STATUSES = ['draft', 'active', 'archived'];


  function num(v, d) { const n = Number(v); return Number.isFinite(n) ? n : (d || 0); }

  function component(input) {
    const i = input || {};
       const qty = num(i.quantityRequired, 1);
       const unitCost = num(i.unitCostPreview);
       const avail = num(i.availableStockPreview);
       const totalCost = qty * unitCost;
       const shortage = Math.max(0, qty - avail);
       const warnings = [];
    if (unitCost === 0 && ['raw_material', 'semi_finished_good', 'packaging_material'].includes(i.componentType))
  warnings.push('missing_unit_cost');
       if (shortage > 0) warnings.push('shortage');
       return {
         productId: i.productId || 'cmp_' + crypto.randomBytes(3).toString('hex'),
         sku: i.sku || 'SKU-' + crypto.randomBytes(2).toString('hex').toUpperCase(),
         productName: i.productName || 'Component',
         componentType: COMPONENT_TYPES.includes(i.componentType) ? i.componentType : 'raw_material',
         quantityRequired: qty,
         unitCostPreview: unitCost,
         totalCostPreview: totalCost,
         availableStockPreview: avail,
         shortagePreview: shortage,
         substituteAllowedPreview: !!i.substituteAllowedPreview,
         warnings,
       };
  }


  function newBom(input) {
    const now = new Date().toISOString();
       const i = input || {};
       const components = (i.components || []).map(component);
       const materialCost = components.reduce((a, c) => a + c.totalCostPreview, 0);
       const labor = num(i.laborCostPreview);
       const overhead = num(i.overheadCostPreview);
       const wastagePct = num(i.wastagePercentPreview);
       const wastageCost = (materialCost + labor + overhead) * (wastagePct / 100);
       const totalCost = Math.round((materialCost + labor + overhead + wastageCost) * 100) / 100;

      const suggested = i.suggestedSalePricePreview != null ? num(i.suggestedSalePricePreview) : Math.round(totalCost /
  0.65); // 35% target margin
    const margin = suggested > 0 ? Math.round(((suggested - totalCost) / suggested) * 100) : 0;
      return {
        id: i.id || 'bom_' + crypto.randomBytes(5).toString('hex'),
        finishedProductId: i.finishedProductId || 'fp_' + crypto.randomBytes(3).toString('hex'),
        finishedSku: i.finishedSku || 'FG-' + crypto.randomBytes(2).toString('hex').toUpperCase(),
        finishedProductName: i.finishedProductName || 'Finished product',
        components,
        laborCostPreview: labor,
        overheadCostPreview: overhead,
        wastagePercentPreview: wastagePct,
        materialCostPreview: Math.round(materialCost * 100) / 100,
        totalCostPreview: totalCost,
        suggestedSalePricePreview: suggested,
        marginPreview: margin,
        status: BOM_STATUSES.includes(i.status) ? i.status : 'active',
        dryRun: true,
        createdAt: i.createdAt || now,
        updatedAt: now,
      };
  }

  function seeds() {
    return [
      newBom({ id: 'bom_kit1', finishedSku: 'FG-STARTER', finishedProductName: 'Starter Kit', laborCostPreview: 50,
  overheadCostPreview: 30, wastagePercentPreview: 3,
           components: [
             { productName: 'USB Dongle', componentType: 'raw_material', quantityRequired: 1, unitCostPreview: 1500,
  availableStockPreview: 60 },
          { productName: 'Charging Cable', componentType: 'raw_material', quantityRequired: 1, unitCostPreview: 100,
  availableStockPreview: 4 },
          { productName: 'Box', componentType: 'packaging_material', quantityRequired: 1, unitCostPreview: 40,
  availableStockPreview: 500 },
        ] }),
      newBom({ id: 'bom_kit2', finishedSku: 'FG-COMBO', finishedProductName: 'Combo Pack', laborCostPreview: 20,
  overheadCostPreview: 10, wastagePercentPreview: 8,
           components: [
             { productName: 'Cable', componentType: 'raw_material', quantityRequired: 2, unitCostPreview: 100,
  availableStockPreview: 4 },
          { productName: 'Sticker', componentType: 'consumable_preview', quantityRequired: 1, unitCostPreview: 5,
  availableStockPreview: 1000 },
        ] }),
      ];
  }

  module.exports = { COMPONENT_TYPES, BOM_STATUSES, component, newBom, seeds, num };
