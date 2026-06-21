 'use strict';
 /**
  * customerPortalService.js — read-only service over portal preview customers,
  * seeded on first read. Resolves a customer by DEMO-SAFE preview token only
  * (never by raw phone/email). No mutation, no sends, no external calls.
  */
 const store = require('./store');
 const model = require('./customerPortalModel');

 function ensureSeeded() { if (store.all().length === 0) store.bulkPut(model.seeds()); }
 function list() { ensureSeeded(); return store.all().map((c) => ({ previewToken: c.previewToken, displayNameSafe:
 c.displayNameSafe })); }
 function getByToken(previewToken) { ensureSeeded(); return store.get(previewToken); }
 function create(input) {
   // Accepts raw-ish input but masks immediately via the model; only token persisted.
   const c = model.newCustomer(input);
   store.put(c);
   return { ok: true, dryRun: true, previewToken: c.previewToken, customerMaskedPreview: { displayNameSafe:
 c.displayNameSafe, phoneMasked: c.phoneMasked, emailMasked: c.emailMasked } };
 }
 module.exports = { ensureSeeded, list, getByToken, create };
