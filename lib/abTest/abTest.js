// lib/abTest/abTest.js
// ────────────────────────────────────────────────────────────────────
// AI A/B Testing Engine. The copywriter (#13) makes variants and the broadcast
// analyzer (#44) grades a finished send — this is the missing middle: run a real
// experiment. Create N variants, assign each contact to one (stable, even split),
// track impressions + conversions, and declare a winner ONLY when the result is
// statistically sound (min sample + a two-proportion z-test confidence), so you
// don\'t crown a winner on noise.
//
// All stats are deterministic + explainable; the AI Brain Bridge (Ollama) only
// phrases the verdict. File-backed. Zero new npm dependencies.
// ────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let processPrompt;
try { ({ processPrompt } = require('../../ai/aiBrain')); }
catch (e) { console.warn('[abTest] aiBrain unavailable:', e.message); processPrompt = null; }

const MODEL = () => process.env.ABTEST_MODEL || process.env.SUPPORT_AGENT_MODEL || 'qwen2.5:32b';

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'ab_test');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const expFile = (storeId) => path.join(DATA_DIR, `${storeId}_experiments.json`);

function readJSON(p, fb) { try { return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : fb; } catch { return fb; } }
function writeJSON(p, d) { try { fs.writeFileSync(p, JSON.stringify(d, null, 2)); } catch (e) { console.error('[abTest] write failed:', e.message); } }
function readExp(storeId) { return readJSON(expFile(storeId), {}); }
function writeExp(storeId, d) { writeJSON(expFile(storeId), d); }

const DEFAULTS = { minSamplePerVariant: 100, confidenceThreshold: 0.95 };

/**
 * Create an experiment. variants = [{ id?, label, content? }] (>=2).
 */
function create({ storeId = 'default_store', id, name, variants = [], goal = 'conversion', minSamplePerVariant, confidenceThreshold } = {}) {
  if (!id) throw new Error('id is required');
  if (!Array.isArray(variants) || variants.length < 2) throw new Error('at least 2 variants required');
  const exps = readExp(storeId);
  if (exps[id]) return { ok: false, error: 'experiment already exists', experiment: exps[id] };
  const vs = variants.map((v, i) => ({ id: v.id || String.fromCharCode(65 + i), label: v.label || `Variant ${String.fromCharCode(65 + i)}`, content: v.content || null, impressions: 0, conversions: 0 }));
  const rec = {
    id, name: name || id, goal, status: 'running',
    minSamplePerVariant: minSamplePerVariant || DEFAULTS.minSamplePerVariant,
    confidenceThreshold: confidenceThreshold || DEFAULTS.confidenceThreshold,
    variants: vs, createdAt: Date.now()
  };
  exps[id] = rec; writeExp(storeId, exps);
  return { ok: true, experiment: rec };
}

// stable assignment: hash(experiment+contact) -> variant index (even split)
function assignIndex(expId, contact, n) {
  const h = crypto.createHash('md5').update(`${expId}::${contact}`).digest();
  // use first 4 bytes as uint32
  const v = h.readUInt32BE(0);
  return v % n;
}

/**
 * Assign a contact to a variant (stable: same contact always gets the same one).
 */
function assign({ storeId = 'default_store', id, contact } = {}) {
  if (!id || !contact) throw new Error('id and contact are required');
  const exps = readExp(storeId); const exp = exps[id];
  if (!exp) return { ok: false, error: 'unknown experiment' };
  const idx = assignIndex(id, contact, exp.variants.length);
  const variant = exp.variants[idx];
  return { ok: true, variantId: variant.id, label: variant.label, content: variant.content };
}

function bump({ storeId = 'default_store', id, variantId, field, count = 1 } = {}) {
  const exps = readExp(storeId); const exp = exps[id];
  if (!exp) return { ok: false, error: 'unknown experiment' };
  const v = exp.variants.find(x => x.id === variantId);
  if (!v) return { ok: false, error: 'unknown variant' };
  v[field] = (v[field] || 0) + count;
  exps[id] = exp; writeExp(storeId, exps);
  return { ok: true, variant: { id: v.id, impressions: v.impressions, conversions: v.conversions } };
}
function recordImpression(args) { return bump({ ...args, field: 'impressions' }); }
function recordConversion(args) { return bump({ ...args, field: 'conversions' }); }

// ── Statistics ───────────────────────────────────────────────
// standard normal CDF via erf approximation (Abramowitz & Stegun 7.1.26)
function normCdf(z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  let p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  p = 1 - p;
  return z >= 0 ? p : 1 - p;
}
// two-proportion z-test: confidence that pA != pB (two-sided)
function twoPropConfidence(cA, nA, cB, nB) {
  if (nA === 0 || nB === 0) return 0;
  const pA = cA / nA, pB = cB / nB;
  const pPool = (cA + cB) / (nA + nB);
  const se = Math.sqrt(pPool * (1 - pPool) * (1 / nA + 1 / nB));
  if (se === 0) return 0;
  const z = Math.abs(pA - pB) / se;
  return +(2 * normCdf(z) - 1).toFixed(4); // two-sided confidence 0..1
}

/**
 * Compute results: per-variant rate, the leader, lift over the runner-up, the
 * confidence the leader is real, and whether a winner can be declared.
 */
function results({ storeId = 'default_store', id } = {}) {
  const exp = readExp(storeId)[id];
  if (!exp) return { ok: false, error: 'unknown experiment' };
  const variants = exp.variants.map(v => ({ id: v.id, label: v.label, impressions: v.impressions, conversions: v.conversions, rate: v.impressions ? +(v.conversions / v.impressions).toFixed(4) : 0 }));
  const sorted = [...variants].sort((a, b) => b.rate - a.rate);
  const leader = sorted[0], runnerUp = sorted[1];
  const confidence = (leader && runnerUp) ? twoPropConfidence(leader.conversions, leader.impressions, runnerUp.conversions, runnerUp.impressions) : 0;
  const lift = (runnerUp && runnerUp.rate > 0) ? +(((leader.rate - runnerUp.rate) / runnerUp.rate) * 100).toFixed(1) : null;
  const minMet = variants.every(v => v.impressions >= exp.minSamplePerVariant);
  const canDeclare = minMet && confidence >= exp.confidenceThreshold && leader.rate > runnerUp.rate;
  return { ok: true, id, status: exp.status, goal: exp.goal, variants, leader: leader ? leader.id : null, lift, confidence, minSampleMet: minMet, minSamplePerVariant: exp.minSamplePerVariant, confidenceThreshold: exp.confidenceThreshold, canDeclareWinner: canDeclare, winner: exp.winner || null };
}

async function verdict({ storeId = 'default_store', id } = {}) {
  const r = results({ storeId, id });
  if (!r.ok) return r;
  let message;
  if (r.winner) message = `Winner: ${r.winner} (concluded).`;
  else if (r.canDeclareWinner) message = `${r.leader} is winning with ${(r.confidence * 100).toFixed(1)}% confidence${r.lift != null ? `, +${r.lift}% lift` : ''}. Safe to call it.`;
  else if (!r.minSampleMet) message = `Keep running — need ≥ ${r.minSamplePerVariant} impressions per variant first.`;
  else message = `No clear winner yet (only ${(r.confidence * 100).toFixed(1)}% confidence). Keep collecting data.`;
  if (processPrompt) {
    try {
      const raw = await processPrompt(['Summarize this A/B test for a marketer in ONE line + a clear recommendation.', `Data: ${JSON.stringify({ variants: r.variants, confidence: r.confidence, lift: r.lift, canDeclare: r.canDeclareWinner })}`, 'Return ONLY the line.'].join('\n'), { model: MODEL() });
      if (raw && !/\[AI Assist\]|Connect your .* in the environment/i.test(raw)) message = String(raw).trim();
    } catch { /* keep deterministic */ }
  }
  return { ...r, message, source: processPrompt ? 'ollama' : 'fallback' };
}

/** Conclude: lock in the winner (manual, or auto when canDeclareWinner). */
function conclude({ storeId = 'default_store', id, winnerId } = {}) {
  const exps = readExp(storeId); const exp = exps[id];
  if (!exp) return { ok: false, error: 'unknown experiment' };
  let winner = winnerId;
  if (!winner) { const r = results({ storeId, id }); if (!r.canDeclareWinner) return { ok: false, error: 'cannot auto-declare: not statistically significant yet', confidence: r.confidence }; winner = r.leader; }
  if (!exp.variants.find(v => v.id === winner)) return { ok: false, error: 'unknown variant' };
  exp.status = 'concluded'; exp.winner = winner; exp.concludedAt = Date.now();
  exps[id] = exp; writeExp(storeId, exps);
  return { ok: true, id, winner };
}

function listExperiments({ storeId = 'default_store', status } = {}) {
  let list = Object.values(readExp(storeId)).sort((a, b) => b.createdAt - a.createdAt);
  if (status) list = list.filter(e => e.status === status);
  return list.map(e => ({ id: e.id, name: e.name, status: e.status, variants: e.variants.length, winner: e.winner || null }));
}

function health() { return { ok: true, brainBridge: Boolean(processPrompt), model: MODEL() }; }

module.exports = { create, assign, recordImpression, recordConversion, results, verdict, conclude, listExperiments, health, _internal: { assignIndex, twoPropConfidence, normCdf, DEFAULTS } };
