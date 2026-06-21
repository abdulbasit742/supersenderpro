  'use strict';
  /**
   * materialRequirement.js — explodes a BOM x quantity into required materials,
      * compares against available stock (from BOM components or supplied stock map),
      * and lists shortages + purchase suggestions. Never mutates stock.
   */
  function check(bom, quantityToProduce, stockMap) {
       const qty = Number(quantityToProduce) || 1;
       const required = [];
       const available = [];
       const shortages = [];
       const purchaseSuggestion = [];
       (bom.components || []).forEach((c) => {
         if (['service_labor_preview', 'overhead_preview'].includes(c.componentType)) return; // not stock
         const needed = c.quantityRequired * qty;
         const onHand = stockMap && stockMap[c.productId] != null ? Number(stockMap[c.productId]) : c.availableStockPreview;
         required.push({ productId: c.productId, sku: c.sku, productName: c.productName, requiredQtyPreview: needed });
         available.push({ productId: c.productId, availableStockPreview: onHand });
         const short = Math.max(0, needed - onHand);
         if (short > 0) {
           shortages.push({ productId: c.productId, productName: c.productName, shortageQtyPreview: short });
        purchaseSuggestion.push({ productId: c.productId, productName: c.productName, suggestedPurchaseQtyPreview: short,
  estCostPreview: Math.round(short * c.unitCostPreview * 100) / 100 });
         }
       });
       return {
         ok: true, dryRun: true, liveStockMutation: false,
         requiredMaterialsPreview: required,
         availableMaterialsPreview: available,
         shortagesPreview: shortages,
         purchaseSuggestionPreview: purchaseSuggestion,
         warnings: shortages.length ? ['raw_material_shortage'] : [],
         blockers: [],
       };
  }
  module.exports = { check };
