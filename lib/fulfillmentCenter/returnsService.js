  'use strict';

  /** Fulfillment Center — return/RMA CRUD + approval preview. */

  const store = require('./store');
  const model = require('./returnRequestModel');
  const refundImpact = require('./refundImpactPreview');
  const restock = require('./inventoryRestockPreview');
  const { redactDeep } = require('./redactor');

  function list(filter) {
      let items = store.readReturns();
      const f = filter || {};
      if (f.status) items = items.filter((x) => x.status === f.status);
      if (f.reason) items = items.filter((x) => x.reason === f.reason);
      return items.slice(0, Number.isFinite(f.limit) ? f.limit : 100).map(redactDeep);
  }
  function getRaw(id) { return store.readReturns().find((x) => x.id === id || x.rmaNumber === id) || null; }
  function get(id) { const x = getRaw(id); return x ? redactDeep(x) : null; }


  function create(input) {
      const returns = store.readReturns();
      const r = model.build(input, returns.length);
      returns.unshift(r);
      if (returns.length > 3000) returns.length = 3000;
      store.writeReturns(returns);
      return redactDeep(r);
  }

  function mutate(id, fn) {
    const returns = store.readReturns();
      const idx = returns.findIndex((x) => x.id === id || x.rmaNumber === id);
      if (idx === -1) return null;
      const updated = fn(returns[idx]);
      updated.dryRun = true; updated.updatedAt = new Date().toISOString();
      returns[idx] = updated; store.writeReturns(returns);
      return updated;
  }

  /** Approve preview: computes refund + restock + loss impact, never executes. */
  function approvePreview(id) {
      const r = getRaw(id);
      if (!r) return { ok: false, error: 'return not found' };


          const refund = refundImpact.preview(r);
          const rs = restock.preview(r);
          mutate(id, (x) => { x.status = 'approved_preview'; x.refundAmountPreview = refund.refundAmountPreview; x.restockPreview
  = rs.restockItemsPreview; x.lossImpactPreview = refund.lossImpactPreview; return x; });
    return {
            ok: true, dryRun: true, liveRefund: false, liveRestock: false,
            returnId: r.id,
            refundAmountPreview: refund.refundAmountPreview,
            restockItemsPreview: rs.restockItemsPreview,
            lossImpactPreview: refund.lossImpactPreview,
            warnings: [...(refund.warnings || []), ...(rs.warnings || [])],
            blockers: [],
          };
  }


  module.exports = { list, get, getRaw, create, mutate, approvePreview };
