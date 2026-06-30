// lib/experiments/index.js
// A/B testing orchestrator: create experiments, assign recipients to variants
// (deterministic + sticky + weighted), record outcomes, and compute results
// with real statistical significance.
//
// Outcome events can be recorded explicitly (track) OR derived from the CRM
// interaction log (an order/reply after a send counts as a conversion), so it
// plugs into the data the app already produces without new instrumentation.

const crypto = require('crypto');
const store = require('./experimentStore');
const stats = require('./statistics');

let storeCRM = null;
try { storeCRM = require('../storeCRM'); } catch { /* optional */ }

const METRICS = ['replied', 'ordered', 'delivered']; // what counts as "conversion"

function newId() {
  try { if (crypto.randomUUID) return 'exp_' + crypto.randomUUID().slice(0, 12); } catch {}
  return 'exp_' + crypto.randomBytes(8).toString('hex');
}

// Deterministic 0..1 hash of a string (so assignment is stable across restarts).
function hashUnit(s) {
  const h = crypto.createHash('sha256').update(String(s)).digest();
  // first 6 bytes -> integer -> normalise
  const n = h.readUIntBE(0, 6);
  return n / 0xffffffffffff;
}

function createExperiment(storeId, { name, metric = 'replied', variants = [] }) {
  if (!variants.length || variants.length < 2) throw new Error('need at least 2 variants');
  if (!METRICS.includes(metric)) throw new Error(`metric must be one of ${METRICS.join(', ')}`);
  const totalWeight = variants.reduce((s, v) => s + (Number(v.weight) || 1), 0);
  const exp = {
    id: newId(),
    storeId,
    name: name || 'Untitled experiment',
    metric,
    variants: variants.map((v, i) => ({
      key: v.key || String.fromCharCode(65 + i), // A, B, C...
      label: v.label || `Variant ${String.fromCharCode(65 + i)}`,
      template: v.template || '',
      weight: (Number(v.weight) || 1) / totalWeight,
    })),
    status: 'running', // running | decided | stopped
    winner: null,
    createdAt: new Date().toISOString(),
  };
  return store.saveExperiment(exp);
}

// Assign (or fetch existing sticky assignment for) a recipient.
function assign(storeId, expId, phone) {
  const exp = store.getExperiment(expId);
  if (!exp) throw new Error('experiment not found');
  const existing = store.getAssignment(storeId, expId, phone);
  if (existing) {
    const v = exp.variants.find((x) => x.key === existing.variant) || exp.variants[0];
    return { variant: v.key, label: v.label, template: v.template, sticky: true };
  }
  // Weighted pick from a stable hash of (expId, phone).
  const u = hashUnit(`${expId}:${phone}`);
  let acc = 0;
  let chosen = exp.variants[exp.variants.length - 1];
  for (const v of exp.variants) {
    acc += v.weight;
    if (u <= acc) { chosen = v; break; }
  }
  store.setAssignment(storeId, expId, phone, chosen.key);
  store.addEvent({ storeId, expId, phone, variant: chosen.key, type: 'sent' });
  return { variant: chosen.key, label: chosen.label, template: chosen.template, sticky: false };
}

// Record an outcome for a recipient.
function track(storeId, expId, phone, type) {
  const exp = store.getExperiment(expId);
  if (!exp) throw new Error('experiment not found');
  const a = store.getAssignment(storeId, expId, phone);
  if (!a) throw new Error('recipient was never assigned to this experiment');
  return store.addEvent({ storeId, expId, phone, variant: a.variant, type: String(type) });
}

// Pull conversions implied by the CRM interaction log for assigned recipients,
// so an order/reply that happened naturally still counts toward the metric.
function deriveFromCRM(storeId, exp) {
  if (!storeCRM) return [];
  const derived = [];
  for (const v of exp.variants) { /* nothing per-variant here */ void v; }
  // Look at each assigned phone's recent interactions for a matching metric.
  const events = store.getEvents(storeId, exp.id);
  const assignedPhones = [...new Set(events.filter((e) => e.type === 'sent').map((e) => e.phone))];
  for (const phone of assignedPhones) {
    const a = store.getAssignment(storeId, exp.id, phone);
    if (!a) continue;
    const sentEvt = events.find((e) => e.phone === phone && e.type === 'sent');
    const sinceTs = sentEvt ? new Date(sentEvt.ts).getTime() : 0;
    const already = events.some((e) => e.phone === phone && e.type === exp.metric);
    if (already) continue;
    const interactions = storeCRM.getCustomerInteractions(storeId, phone, 50) || [];
    const hit = interactions.find((i) => {
      const t = new Date(i.ts).getTime();
      if (t < sinceTs) return false;
      if (exp.metric === 'ordered') return i.type === 'order';
      if (exp.metric === 'replied') return i.type === 'inbound' || i.type === 'reply' || i.type === 'message_in';
      return false;
    });
    if (hit) derived.push(store.addEvent({ storeId, expId: exp.id, phone, variant: a.variant, type: exp.metric, derived: true }));
  }
  return derived;
}

// Compute per-variant results + significance vs. the control (first variant).
function results(storeId, expId, { deriveCRM = false } = {}) {
  const exp = store.getExperiment(expId);
  if (!exp) throw new Error('experiment not found');
  if (deriveCRM) deriveFromCRM(storeId, exp);

  const events = store.getEvents(storeId, expId);
  const perVariant = exp.variants.map((v) => {
    const sent = events.filter((e) => e.variant === v.key && e.type === 'sent').length;
    const conv = new Set(
      events.filter((e) => e.variant === v.key && e.type === exp.metric).map((e) => e.phone)
    ).size;
    return { key: v.key, label: v.label, sent, conversions: conv, rate: sent ? conv / sent : 0 };
  });

  const control = perVariant[0];
  const comparisons = perVariant.slice(1).map((v) => ({
    variant: v.key,
    vsControl: stats.twoProportionTest(control.conversions, control.sent, v.conversions, v.sent),
  }));

  // Leader = highest rate with a meaningful sample.
  const ranked = [...perVariant].sort((a, b) => b.rate - a.rate);
  const leader = ranked[0];
  const leaderCmp = leader.key === control.key
    ? null
    : comparisons.find((c) => c.variant === leader.key);
  const decided = !!(leaderCmp && leaderCmp.vsControl.ok && leaderCmp.vsControl.significant);

  return {
    experiment: { id: exp.id, name: exp.name, metric: exp.metric, status: exp.status, winner: exp.winner },
    perVariant: perVariant.map((v) => ({ ...v, rate: stats.round(v.rate) })),
    comparisons,
    leader: leader.key,
    decided,
    recommendation: decided
      ? `Promote ${leader.label} — ${stats.round(leader.rate * 100, 1)}% vs control, significant.`
      : 'Keep running — no statistically significant winner yet.',
  };
}

// Lock in a winner (called by the batch when significant, or manually).
function decideWinner(expId, variantKey) {
  const exp = store.getExperiment(expId);
  if (!exp) throw new Error('experiment not found');
  exp.winner = variantKey;
  exp.status = 'decided';
  exp.decidedAt = new Date().toISOString();
  return store.saveExperiment(exp);
}

function listExperiments(storeId) { return store.listExperiments(storeId); }
function getExperiment(id) { return store.getExperiment(id); }

module.exports = {
  METRICS, createExperiment, assign, track, results, decideWinner,
  deriveFromCRM, listExperiments, getExperiment, hashUnit,
};
