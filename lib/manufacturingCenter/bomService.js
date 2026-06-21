  'use strict';
  /**
   * bomService.js — CRUD over BOMs, seeded on first read. Preview-only. Forces dryRun true.
   */
  const store = require('./store');
  const model = require('./bomModel');

  function ensureSeeded() { if (store.allBoms().length === 0) store.bulkPutBoms(model.seeds()); }
  function list(filter) { ensureSeeded(); const f = filter || {}; return store.allBoms().filter((b) => (!f.status ||
  b.status === f.status)); }
  function get(id) { ensureSeeded(); return store.getBom(id); }
  function create(input) { const b = model.newBom(input); store.putBom(b); return { ok: true, dryRun: true, bom: b }; }
  function update(id, patch) {
    ensureSeeded();
    const cur = store.getBom(id);
    if (!cur) return { ok: false, errors: ['not_found'] };
    const merged = model.newBom(Object.assign({}, cur, patch, { id: cur.id, createdAt: cur.createdAt }));
    store.putBom(merged);
    return { ok: true, dryRun: true, bom: merged };
  }
  function costPreview(id) {
    const b = get(id);
    if (!b) return { ok: false, error: 'not_found' };
    return {
      ok: true, dryRun: true, bomId: b.id,
      materialCostPreview: b.materialCostPreview,
      laborCostPreview: b.laborCostPreview,
      overheadCostPreview: b.overheadCostPreview,
      wastageCostPreview: Math.round((b.totalCostPreview - b.materialCostPreview - b.laborCostPreview -
  b.overheadCostPreview) * 100) / 100,
      totalCostPreview: b.totalCostPreview,
      marginPreview: b.marginPreview,
      warnings: b.marginPreview < 10 ? ['margin_too_low'] : [],
      blockers: [],
    };
  }
  module.exports = { ensureSeeded, list, get, create, update, costPreview };
