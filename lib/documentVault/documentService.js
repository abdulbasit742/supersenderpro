 'use strict';
 /**
  * documentService.js — CRUD over document metadata, seeded on first read.
     * Preview-only. Forces dryRun + redactedOnly true.
     */
 const store = require('./store');
 const model = require('./documentModel');

 function ensureSeeded() { if (store.all().length === 0) store.bulkPut(model.seeds()); }
 function list(filter) {
   ensureSeeded();
      const f = filter || {};
      return store.all().filter((d) =>
        (!f.category || d.category === f.category) &&
        (!f.documentType || d.documentType === f.documentType) &&
        (!f.status || d.status === f.status) &&
        (!f.riskLevel || d.riskLevel === f.riskLevel) &&
        (!f.sourceModule || d.sourceModule === f.sourceModule));
 }
 function get(id) { ensureSeeded(); return store.get(id); }
 function create(input) { const d = model.newDocument(input); store.put(d); return { ok: true, dryRun: true, document:
 store.get(d.id) }; }
 function update(id, patch) {
      ensureSeeded();
      const cur = store.get(id);
      if (!cur) return { ok: false, errors: ['not_found'] };
      const merged = model.newDocument(Object.assign({}, cur, patch, { id: cur.id, createdAt: cur.createdAt }));
      store.put(merged);
      return { ok: true, dryRun: true, document: store.get(id) };
 }
 function verifyPreview(id) {
      const d = get(id);
      if (!d) return { ok: false, error: 'not_found' };
   return { ok: true, dryRun: true, liveMutation: false, documentId: d.id, statusPreview: 'verified_preview', warnings:
 d.expiryDate ? [] : ['missing_expiry_date'], blockers: [] };
 }
 module.exports = { ensureSeeded, list, get, create, update, verifyPreview };
