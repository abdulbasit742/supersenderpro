// lib/serviceCenter/partsRequirementPreview.js
// Computes required parts for a job and previews availability against inventory.
// Reuses Inventory Control / Product Catalog read-only when present; degrades to seed.
'use strict';

const store = require('./store');
const jobCardModel = require('./jobCardModel');

// Fault-tolerant read-only require of existing modules.
function tryRequire(paths) {
  for (const p of paths) {
         try { return require(p); } catch (e) { /* degrade */ }
     }
     return null;
}

const inventory = tryRequire(['../inventoryControl/inventoryService', '../inventoryControl', '../inventory/store']);
const catalog = tryRequire(['../productCatalogMaster/catalogService', '../productCatalogMaster']);

// Seed stock fallback so previews render offline.
const SEED_STOCK = {
     'PART-GAS-R410': 4, 'PART-DRAIN-KIT': 9, 'PART-FILTER': 0,
     'PART-BREAKER-20A': 2, 'PART-WIRE-2.5': 50, 'PART-CAPACITOR': 1, 'PART-IMPELLER': 0
};

function stockFor(sku) {
  try {
         if (inventory && typeof inventory.getStock === 'function') {
           const s = inventory.getStock(sku);
             if (typeof s === 'number') return { qty: s, source: 'inventoryControl' };
         }
     } catch (e) { /* degrade */ }
     return { qty: SEED_STOCK[sku] != null ? SEED_STOCK[sku] : null, source: 'seed' };
}

function forJobCard(jcId) {
  const jc = store.getJobCard(jcId);
     if (!jc) return { ok: false, errors: ['job card not found'] };
     const lines = jc.parts.map((p) => {
         const st = stockFor(p.sku);
         const available = st.qty == null ? null : st.qty >= p.qty;
         return {
           sku: p.sku, name: p.name, required: p.qty,
             onHand: st.qty, source: st.source,
             available, shortBy: st.qty == null ? null : Math.max(0, p.qty - st.qty)
       };
     });
     const shortages = lines.filter((l) => l.available === false);
     return {


     ok: true,
     ref: jc.ref,
     catalogConnected: !!catalog,
     inventoryConnected: !!inventory,
     lines,
     fulfillable: shortages.length === 0,
     shortages,
     partsCost: jobCardModel.partsCost(jc),
     note: 'Preview only. No stock reserved or deducted.'
   };
}

module.exports = { forJobCard, stockFor };
