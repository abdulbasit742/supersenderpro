   'use strict';
   /** CRUD for resellers. Whitelisted fields per reseller; never exposes other resellers' data on detail. */
   const store = require('./store');
   const profiles = require('./resellerProfiles');
   const privacyGuard = require('./privacyGuard');
   function list() { return Object.values(store.load().resellers); }
   function get(id) { return store.load().resellers[id] || null; }
   function create(input) {
     if (input && input.partnerTier && !profiles.PARTNER_TIERS.includes(input.partnerTier)) return { ok: false, errors:
   ['invalid_tier'] };
     const state = store.load();
       const r = profiles.defaults(input || {});
       state.resellers[r.id] = r; store.save(state);
       store.appendHistory({ kind: 'reseller_created', id: r.id, tier: r.partnerTier });
       return { ok: true, reseller: r };
   }
   function update(id, patch) {
       const state = store.load(); const cur = state.resellers[id]; if (!cur) return { ok: false, errors: ['not_found'] };

    if (patch.partnerTier && !profiles.PARTNER_TIERS.includes(patch.partnerTier)) return { ok: false, errors:
['invalid_tier'] };
  if (patch.status && !profiles.STATUSES.includes(patch.status)) return { ok: false, errors: ['invalid_status'] };
  const next = Object.assign({}, cur, privacyGuard.maskDeep(patch || {}), { id: cur.id, createdAt: cur.createdAt,
updatedAt: new Date().toISOString(), dryRun: true, payoutStatus: 'preview_only' });
    state.resellers[id] = next; store.save(state);
    store.appendHistory({ kind: 'reseller_updated', id });
    return { ok: true, reseller: next };
}
module.exports = { list, get, create, update };
