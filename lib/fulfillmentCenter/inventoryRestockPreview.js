  'use strict';


  /**
   * Fulfillment Center — inventory restock preview (no real stock mutation).
      *


   * Only sellable returns (not damaged/defective) are previewed as restockable.
   */

  function preview(ret) {
    const r = ret || {};
    const items = Array.isArray(r.requestedItems) ? r.requestedItems : [];
    const notResellable = ['damaged_item', 'defective_item'].includes(r.reason);
    const restockItemsPreview = items.map((it) => ({
      sku: it.sku || null,
        name: it.name || 'Item',
        qty: Number(it.qty) || 0,
        wouldRestock: !notResellable,
        reason: notResellable ? 'not resellable (damaged/defective)' : 'returnable to sellable stock',
    }));
    const warnings = [];
    if (notResellable) warnings.push('items flagged not resellable; would route to damaged bin (preview)');
    return { ok: true, dryRun: true, liveStockMutation: false, restockItemsPreview, warnings, blockers:
  ['live_stock_mutation_disabled'] };
  }

  module.exports = { preview };
