  'use strict';


  /**
   * Loyalty Center — points ledger (preview entries).
      *
      * Each entry is a what-if preview; no live points are written to any real
      * wallet. Balances are computed from preview entries only.
      */


  const store = require('./store');
  const { maskRef } = require('./redactor');


  const ENTRY_TYPES = ['order_reward_preview', 'pos_sale_reward_preview', 'referral_bonus_preview',
  'birthday_bonus_preview', 'manual_adjustment_preview', 'redemption_preview', 'expired_points_preview',
  'refund_reversal_preview'];


  function list(filter) {
    let items = store.readLedger();
       const f = filter || {};
       if (f.customerId) items = items.filter((x) => x.customerId === f.customerId);
       if (f.entryType) items = items.filter((x) => x.entryType === f.entryType);
       return items.slice(0, Number.isFinite(f.limit) ? f.limit : 200);
  }

  function balanceFor(customerId) {
    return store.readLedger().filter((e) => e.customerId === customerId).reduce((s, e) => s + (Number(e.pointsPreview) ||
  0), 0);
  }


/** Append a preview entry (still dry-run). Redemptions/expirations are negative. */
function addPreview(input) {
   const i = input || {};
   const type = ENTRY_TYPES.includes(i.entryType) ? i.entryType : 'manual_adjustment_preview';
   let pts = Number(i.pointsPreview) || 0;
   if (type === 'redemption_preview' || type === 'expired_points_preview' || type === 'refund_reversal_preview') pts = -
Math.abs(pts);
 const entry = {
    id: store.genId('ple'),
    customerId: String(i.customerId || ''),
    entryType: type,
    pointsPreview: pts,
    sourceModule: String(i.sourceModule || 'order_preview').slice(0, 40),
    referenceMasked: i.reference ? maskRef(i.reference) : null,
    status: 'preview',
    dryRun: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
   };
   const entries = store.readLedger();
   entries.unshift(entry);
   if (entries.length > 5000) entries.length = 5000;
   store.writeLedger(entries);
   return entry;
}


module.exports = { ENTRY_TYPES, list, balanceFor, addPreview };
