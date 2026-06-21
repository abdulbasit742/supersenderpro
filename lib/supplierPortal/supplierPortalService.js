  'use strict';
  /**
   * supplierPortalService.js — read-only service over portal preview suppliers,
      * seeded on first read. Resolves by DEMO-SAFE preview token only. No mutation,
      * no sends, no external calls.
   */
  const store = require('./store');
  const model = require('./supplierPortalModel');
  function ensureSeeded() { if (store.all().length === 0) store.bulkPut(model.seeds()); }
  function list() { ensureSeeded(); return store.all().map((s) => ({ previewToken: s.previewToken, displayNameSafe:
  s.displayNameSafe })); }
  function getByToken(token) { ensureSeeded(); return store.get(token); }
  function create(input) { const s = model.newSupplier(input); store.put(s); return { ok: true, dryRun: true, previewToken:
  s.previewToken, supplierMaskedPreview: { displayNameSafe: s.displayNameSafe, phoneMasked: s.phoneMasked, emailMasked:
  s.emailMasked, bankMasked: s.bankMasked, taxMasked: s.taxMasked } }; }
  module.exports = { ensureSeeded, list, getByToken, create };
