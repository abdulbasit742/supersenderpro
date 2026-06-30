// lib/returns/returnEngine.js
// Orchestrates the RMA lifecycle and wires (optionally) into sibling depts:
//   - Inventory (#66): restock returned items on receive
//   - Customer 360 (#46): record a return.refunded event
//   - Alert Center (#28): customer notifications (draft-only by default)
//   - Payments (#1): NOT called here. Returns proposes a refund; Payments pays.
//
// Every sibling is OPTIONAL. When absent, the engine degrades to a no-op for
// that side-effect and keeps working.

'use strict';

const config = require('./config');
const store = require('./returnStore');
const { computeRefund } = require('./refundCalc');
const { notify } = require('./notify');

// Optional sibling loader. Returns null when the module isn't present.
function optional(mod) {
  try {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    return require(mod);
  } catch (e) {
    return null;
  }
}

function createReturn(tenantId, payload) {
  return store.create(tenantId, payload);
}

function approve(tenantId, id, meta = {}) {
  const rec = store.transition(tenantId, id, 'approved', meta);
  const alerts = optional('../alertCenter');
  return { rec, notice: notify(rec, alerts) };
}

function reject(tenantId, id, meta = {}) {
  const rec = store.transition(tenantId, id, 'rejected', meta);
  const alerts = optional('../alertCenter');
  return { rec, notice: notify(rec, alerts) };
}

function receive(tenantId, id, meta = {}) {
  const rec = store.transition(tenantId, id, 'received', meta);

  // Optional restock via inventory dept.
  let restock = { restocked: false, reason: 'disabled' };
  if (config.restockOnReceive) {
    const inventory = optional('../inventory');
    if (inventory && typeof inventory.adjustStock === 'function') {
      try {
        rec.lineItems.forEach((li) => {
          inventory.adjustStock(tenantId, {
            sku: li.sku,
            delta: Number(li.qty) || 0,
            reason: `return:${rec.id}`
          });
        });
        restock = { restocked: true };
      } catch (e) {
        restock = { restocked: false, error: e.message };
      }
    } else {
      restock = { restocked: false, reason: 'inventory-dept-absent' };
    }
  }

  const alerts = optional('../alertCenter');
  return { rec, restock, notice: notify(rec, alerts) };
}

// Proposes + records a refund and flips status to refunded.
// IMPORTANT: this does NOT charge/credit any card. It records the proposed
// refund and emits an event so Payments (#1) can settle it.
function refund(tenantId, id, opts = {}) {
  const current = store.get(tenantId, id);
  if (!current) throw new Error('returns: RMA not found');
  const proposal = computeRefund(current.lineItems, {
    restockingFeePct: opts.restockingFeePct,
    currency: opts.currency
  });
  const rec = store.transition(tenantId, id, 'refunded', {
    refund: proposal,
    by: opts.by || 'system'
  });

  // Optional: record on Customer 360 timeline.
  const c360 = optional('../customer360');
  if (c360 && typeof c360.recordEvent === 'function' && rec.customer) {
    try {
      c360.recordEvent(tenantId, {
        customer: rec.customer,
        type: 'return.refunded',
        data: { rmaId: rec.id, amount: proposal.net, currency: proposal.currency }
      });
    } catch (e) {
      /* non-fatal */
    }
  }

  const alerts = optional('../alertCenter');
  return {
    rec,
    refund: proposal,
    event: { name: 'return.refunded', rmaId: rec.id, amount: proposal.net },
    notice: notify(rec, alerts)
  };
}

module.exports = { createReturn, approve, reject, receive, refund };
