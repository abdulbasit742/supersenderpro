// lib/experiments/experimentEngine.js — Core: define experiments, assign contacts to variants
// (sticky + weighted), record sends + conversions per variant, and compute results with lift +
// a two-proportion z-test vs the control variant. Advisory winner only (never auto-acts).
//
// An experiment: { id, name, metric, status, variants:[{ id, label, message, weight, isControl,
//   sends, conversions }], createdAt }. assignFor() is what a sender calls to get this contact's
// variant (and its message) right before sending.

const store = require('./store');
const { config } = require('./config');
const assignment = require('./assignment');
const stats = require('./stats');

function _token(contact) { return String(contact); }

function publicView(e) {
 if (!e) return null;
 return {
 id: e.id, name: e.name, metric: e.metric, status: e.status,
 variants: e.variants.map((v) => ({ id: v.id, label: v.label, weight: v.weight, isControl: !!v.isControl, sends: v.sends || 0, conversions: v.conversions || 0 })),
 createdAt: e.createdAt, startedAt: e.startedAt || null, stoppedAt: e.stoppedAt || null,
 winnerVariantId: e.winnerVariantId || null,
 };
}

function create({ name, metric = 'click', variants } = {}) {
 if (!Array.isArray(variants) || variants.length < 2) throw new Error('at least 2 variants are required');
 const norm = variants.map((v, i) => ({
 id: v.id || `v${i + 1}`,
 label: v.label || `Variant ${i + 1}`,
 message: String(v.message || ''),
 weight: Number(v.weight) > 0 ? Number(v.weight) : 1,
 isControl: !!v.isControl,
 sends: 0, conversions: 0,
 }));
 if (!norm.some((v) => v.isControl)) norm[0].isControl = true; // first variant is control by default
 const exp = {
 id: store.genId('exp'), name: name || 'Untitled experiment', metric: String(metric),
 status: 'running', variants: norm, winnerVariantId: null,
 createdAt: store.nowIso(), startedAt: store.nowIso(), stoppedAt: null,
 };
 const d = store.load(); d.experiments.push(exp); d.assignments[exp.id] = {}; store.save(d);
 return publicView(exp);
}

function _get(d, id) { return d.experiments.find((e) => e.id === id); }

// Assign (sticky) + return the variant + its message. Records a send by default (recordSend:true).
function assignFor(experimentId, contact, { recordSend = true } = {}) {
 if (!contact) throw new Error('contact is required');
 const d = store.load();
 const exp = _get(d, experimentId);
 if (!exp) throw new Error('experiment not found');
 if (exp.status !== 'running') {
 // If stopped with a winner, always serve the winner; else serve control.
 const vid = exp.winnerVariantId || (exp.variants.find((v) => v.isControl) || exp.variants[0]).id;
 const v = exp.variants.find((x) => x.id === vid);
 return { experimentId, variantId: v.id, label: v.label, message: v.message, sticky: true, status: exp.status };
 }
 const token = _token(contact);
 d.assignments[experimentId] = d.assignments[experimentId] || {};
 let variantId = d.assignments[experimentId][token];
 if (!variantId) { variantId = assignment.pick(experimentId, token, exp.variants); d.assignments[experimentId][token] = variantId; }
 const v = exp.variants.find((x) => x.id === variantId) || exp.variants[0];
 if (recordSend) v.sends = (v.sends || 0) + 1;
 store.save(d);
 return { experimentId, variantId: v.id, label: v.label, message: v.message, sticky: true, status: exp.status };
}

// Record a conversion for the contact's assigned variant (idempotency is the caller's concern;
// typically called once per contact when the tracked metric fires, e.g. a short-link click #32).
function recordConversion(experimentId, contact) {
 const d = store.load();
 const exp = _get(d, experimentId);
 if (!exp) throw new Error('experiment not found');
 const token = _token(contact);
 const variantId = (d.assignments[experimentId] || {})[token];
 if (!variantId) return { recorded: false, reason: 'contact not assigned' };
 const v = exp.variants.find((x) => x.id === variantId);
 if (!v) return { recorded: false, reason: 'variant gone' };
 v.conversions = (v.conversions || 0) + 1;
 store.save(d);
 return { recorded: true, variantId };
}

function results(experimentId) {
 const d = store.load();
 const exp = _get(d, experimentId);
 if (!exp) return null;
 const control = exp.variants.find((v) => v.isControl) || exp.variants[0];
 const cRate = stats.rate(control.conversions || 0, control.sends || 0);
 const rows = exp.variants.map((v) => {
 const r = stats.rate(v.conversions || 0, v.sends || 0);
 const z = stats.zTest(v.conversions || 0, v.sends || 0, control.conversions || 0, control.sends || 0, config.significanceZ);
 return {
 id: v.id, label: v.label, isControl: !!v.isControl,
 sends: v.sends || 0, conversions: v.conversions || 0,
 conversionRate: Math.round(r * 10000) / 100, // percent, 2dp
 liftVsControlPct: v.isControl ? 0 : stats.lift(r, cRate),
 z: z.z, significant: z.significant,
 };
 });
 // Recommend a winner: best conversion rate, enough sample, and significant vs control.
 const eligible = rows.filter((r) => !r.isControl && r.sends >= config.minSamplePerVariant && r.significant && r.conversionRate > (rows.find((x) => x.isControl).conversionRate));
 const recommended = eligible.sort((a, b) => b.conversionRate - a.conversionRate)[0] || null;
 return {
 experimentId, name: exp.name, metric: exp.metric, status: exp.status,
 minSamplePerVariant: config.minSamplePerVariant, significanceZ: config.significanceZ,
 variants: rows,
 recommendedWinner: recommended ? recommended.id : null,
 winnerVariantId: exp.winnerVariantId || null,
 };
}

function declareWinner(experimentId, variantId) {
 const d = store.load();
 const exp = _get(d, experimentId);
 if (!exp) throw new Error('experiment not found');
 if (!exp.variants.some((v) => v.id === variantId)) throw new Error('variant not in experiment');
 exp.winnerVariantId = variantId; exp.status = 'stopped'; exp.stoppedAt = store.nowIso();
 store.save(d);
 return publicView(exp);
}
function stop(experimentId) {
 const d = store.load(); const exp = _get(d, experimentId);
 if (!exp) throw new Error('experiment not found');
 exp.status = 'stopped'; exp.stoppedAt = store.nowIso(); store.save(d);
 return publicView(exp);
}

function list() { return store.load().experiments.map(publicView); }
function get(id) { return publicView(_get(store.load(), id)); }
function overview() {
 const d = store.load();
 return { generatedAt: store.nowIso(), cards: { experiments: d.experiments.length, running: d.experiments.filter((e) => e.status === 'running').length, stopped: d.experiments.filter((e) => e.status === 'stopped').length, withWinner: d.experiments.filter((e) => e.winnerVariantId).length } };
}

module.exports = { create, assignFor, recordConversion, results, declareWinner, stop, list, get, overview, publicView };
