  'use strict';
  /**
   * cashbookService.js — CRUD over the store, seeded with sample transactions on
      * first read. Preview-only; never moves money. Forces dryRun true.
      */
  const store = require('./store');
  const model = require('./cashTransactionModel');

  function ensureSeeded() { if (store.all().length === 0) store.bulkPut(model.seeds()); }
  function list(filter) {
    ensureSeeded();
       const f = filter || {};
       return store.all().filter((t) =>
           (!f.method || t.method === f.method) &&
           (!f.source || t.source === f.source) &&
           (!f.direction || t.direction === f.direction) &&
           (!f.matchStatus || t.matchStatus === f.matchStatus) &&
           (!f.riskLevel || t.riskLevel === f.riskLevel));
  }
  function get(id) { ensureSeeded(); return store.get(id); }
  function create(input) { const t = model.newTransaction(input); store.put(t); return { ok: true, dryRun: true,
  transaction: store.get(t.id) }; }
  function update(id, patch) {
       ensureSeeded();
       const cur = store.get(id);
       if (!cur) return { ok: false, errors: ['not_found'] };
       const merged = model.newTransaction(Object.assign({}, cur, patch, { id: cur.id, createdAt: cur.createdAt }));
       store.put(merged);
       return { ok: true, dryRun: true, transaction: store.get(id) };
  }
  module.exports = { ensureSeeded, list, get, create, update };
