'use strict';
/**
* journeyService.js — CRUD over the store, seeded with default journeys on first
   * read. Preview-only; never sends. Pure orchestration of model + store.
   */
const store = require('./store');
const model = require('./journeyModel');


function ensureSeeded() {
    if (store.all().length === 0) model.defaults().forEach((j) => store.put(j));
}


function list() { ensureSeeded(); return store.all().map((j) => ({ id: j.id, name: j.name, status: j.status, channelMix:
j.channelMix, steps: j.steps.length, consentRequired: j.consentRequired, dryRun: true })); }
function get(id) { ensureSeeded(); return store.get(id); }
function create(input) { const j = model.newJourney(input); const v = model.validate(j); if (!v.ok) return { ok: false,
errors: v.errors }; store.put(j); return { ok: true, journey: j }; }
function update(id, patch) {
 ensureSeeded();
    const existing = store.get(id);
    if (!existing) return { ok: false, errors: ['not_found'] };
 const merged = model.newJourney(Object.assign({}, existing, patch, { id: existing.id, createdAt: existing.createdAt,
dryRun: true }));
    const v = model.validate(merged);
    if (!v.ok) return { ok: false, errors: v.errors };
    store.put(merged);
    return { ok: true, journey: merged };
}


module.exports = { list, get, create, update, ensureSeeded };
