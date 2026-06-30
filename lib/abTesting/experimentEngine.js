// lib/abTesting/experimentEngine.js — Define + run message A/B experiments. Create an experiment
// with weighted variants (each variant carries the message body), then at send time call
// variantFor(expId, contact) to get the deterministic variant + its body, account the assignment,
// and later recordConversion(expId, contact) when the desired action happens (reply/click/purchase).
// stop() freezes the experiment on the current winner. Experiments are archived, never deleted.

const store = require('./store');
const { config } = require('./config');
const assign = require('./assign');
const stats = require('./stats');

function _mask(c) { if (!c) return null; const s = String(c); const d = s.replace(/[^0-9+]/g, ''); return d.length <= 4 ? '****' : d.slice(0, 3) + '****' + d.slice(-2); }

function publicView(e) {
 if (!e) return null;
 const s = stats.summarize(e);
 return {
 id: e.id, name: e.name, goal: e.goal, status: e.status,
 variants: s.variants, totals: s.totals, enoughSample: s.enoughSample,
 winner: e.lockedWinner || s.winner, locked: !!e.lockedWinner, confidence: s.confidence,
 createdAt: e.createdAt, updatedAt: e.updatedAt,
 };
}

function _norm(variants) {
 if (!Array.isArray(variants) || variants.length < 2) throw new Error('an experiment needs at least 2 variants');
 return variants.map((v, i) => ({ id: v.id || `v${i + 1}`, label: v.label || `Variant ${i + 1}`, body: String(v.body || ''), weight: Number(v.weight) > 0 ? Number(v.weight) : 1, assigned: 0, conversions: 0 }));
}

function create({ name, goal = 'reply', variants } = {}) {
 const now = store.nowIso();
 const exp = { id: store.genId('exp'), name: name || 'Untitled experiment', goal: String(goal), status: 'running', variants: _norm(variants), lockedWinner: null, assignedContacts: {}, convertedContacts: {}, createdAt: now, updatedAt: now };
 const d = store.load(); d.experiments.push(exp); store.save(d);
 return publicView(exp);
}

function _get(d, id) { return d.experiments.find((e) => e.id === id) || null; }

// Deterministic variant for a contact (+ account the assignment once per contact).
function variantFor(experimentId, contact) {
 if (!contact) throw new Error('contact is required');
 const d = store.load();
 const e = _get(d, experimentId);
 if (!e) throw new Error('experiment not found');
 if (e.status !== 'running' && e.lockedWinner) {
 const v = e.variants.find((x) => x.id === e.lockedWinner) || e.variants[0];
 return { experimentId, variantId: v.id, label: v.label, body: v.body, locked: true };
 }
 const variantId = assign.pickVariant(e.id, contact, e.variants);
 const v = e.variants.find((x) => x.id === variantId) || e.variants[0];
 // Account assignment once per unique contact.
 if (!e.assignedContacts[String(contact)]) {
 e.assignedContacts[String(contact)] = variantId;
 v.assigned = (v.assigned || 0) + 1;
 e.updatedAt = store.nowIso();
 store.save(d);
 }
 return { experimentId, variantId: v.id, label: v.label, body: v.body, locked: false };
}

// Record a conversion for the contact's assigned variant (idempotent per contact).
function recordConversion(experimentId, contact) {
 const d = store.load();
 const e = _get(d, experimentId);
 if (!e) throw new Error('experiment not found');
 const variantId = e.assignedContacts[String(contact)];
 if (!variantId) return { ok: false, reason: 'contact was never assigned' };
 if (e.convertedContacts[String(contact)]) return { ok: true, already: true };
 const v = e.variants.find((x) => x.id === variantId);
 if (v) v.conversions = (v.conversions || 0) + 1;
 e.convertedContacts[String(contact)] = variantId;
 e.updatedAt = store.nowIso();
 store.save(d);
 return { ok: true, variantId };
}

function stop(experimentId, { winnerId } = {}) {
 const d = store.load();
 const e = _get(d, experimentId);
 if (!e) throw new Error('experiment not found');
 const summary = stats.summarize(e);
 e.lockedWinner = winnerId || summary.winner || summary.variants[0].id;
 e.status = 'stopped';
 e.updatedAt = store.nowIso();
 store.save(d);
 return publicView(e);
}
function archive(experimentId) {
 const d = store.load(); const e = _get(d, experimentId);
 if (!e) throw new Error('experiment not found');
 e.status = 'archived'; e.updatedAt = store.nowIso(); store.save(d); return publicView(e);
}

function list({ status } = {}) {
 let items = store.load().experiments;
 if (status) items = items.filter((e) => e.status === status);
 return items.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)).map(publicView);
}
function get(id) { return publicView(_get(store.load(), id)); }

function overview() {
 const d = store.load();
 const by = (s) => d.experiments.filter((e) => e.status === s).length;
 return {
 generatedAt: store.nowIso(),
 cards: {
 experiments: d.experiments.length, running: by('running'), stopped: by('stopped'), archived: by('archived'),
 withWinner: d.experiments.filter((e) => e.lockedWinner || stats.summarize(e).winner).length,
 },
 };
}

module.exports = { create, variantFor, recordConversion, stop, archive, list, get, overview, publicView };
