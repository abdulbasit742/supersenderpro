// lib/serviceCenter/inventoryImpactPreview.js
// Previews what stock WOULD be deducted on job completion. Never mutates inventory.
'use strict';


const store = require('./store');
const partsReq = require('./partsRequirementPreview');


const FLAGS = { liveStockMutation: false };

function forJobCard(jcId) {
  const req = partsReq.forJobCard(jcId);
    if (!req.ok) return req;
    const projected = req.lines.map((l) => ({
      sku: l.sku,
      name: l.name,
      onHand: l.onHand,
      deduct: l.required,
      projectedOnHand: l.onHand == null ? null : Math.max(0, l.onHand - l.required),
      wouldGoNegative: l.onHand != null && l.onHand - l.required < 0
    }));
    return {
      ok: true,
      ref: req.ref,
      inventoryConnected: req.inventoryConnected,
      liveStockMutation: FLAGS.liveStockMutation,
      projected,
      blocked: projected.some((p) => p.wouldGoNegative),
      note: 'Preview only. No stock deducted. liveStockMutation disabled.'
    };
}

module.exports = { FLAGS, forJobCard };
