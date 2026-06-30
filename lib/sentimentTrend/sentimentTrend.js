'use strict';
// AI Sentiment Trend Monitor (#120)
// Deterministic sentiment scoring (EN + Roman-Urdu lexicon) with rolling
// time-window aggregation per tenant and negative-spike alerting.
// Self-hosted-first: optional Ollama nuance/summary, graceful fallback.
// Zero new deps. File-backed, tenant-scoped (missing tenantId throws).

const fs = require('fs');
const path = require('path');

let processPrompt = null;
try { ({ processPrompt } = require('../../ai/aiBrain')); } catch (_) { /* optional */ }

const DATA_DIR = path.join(process.cwd(), 'data', 'sentimentTrend');

const POS = ['good','great','thanks','thank','love','awesome','excellent','happy','perfect','nice','best','satisfied','acha','accha','shukria','shukriya','behtreen','zabardast','badhiya','khush','theek','sahi','mast','umda'];
const NEG = ['bad','worst','hate','angry','refund','broken','late','delay','cheat','fraud','scam','poor','useless','terrible','disappointed','problem','issue','complaint','ganda','bekar','bakwas','dhoka','fraud','ghatiya','pareshan','shikayat','kharab','der','paisa wapas','wapas karo','bura'];

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }
function tenantFile(tenantId) {
  if (!tenantId) throw new Error('tenantId required');
  ensureDir(DATA_DIR);
  return path.join(DATA_DIR, String(tenantId).replace(/[^a-zA-Z0-9_-]/g, '_') + '.json');
}
function load(tenantId) {
  const f = tenantFile(tenantId);
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (_) { return { events: [] }; }
}
function save(tenantId, state) {
  fs.writeFileSync(tenantFile(tenantId), JSON.stringify(state, null, 2));
}

function scoreText(text) {
  const t = String(text || '').toLowerCase();
  let pos = 0, neg = 0;
  for (const w of POS) if (t.includes(w)) pos++;
  for (const w of NEG) if (t.includes(w)) neg++;
  const raw = pos - neg;
  const score = Math.max(-1, Math.min(1, raw / 3));
  let label = 'neutral';
  if (score > 0.15) label = 'positive';
  else if (score < -0.15) label = 'negative';
  return { score: Number(score.toFixed(3)), label, pos, neg };
}

function record(tenantId, { text, contactId = null, ts = Date.now() } = {}) {
  const state = load(tenantId);
  const s = scoreText(text);
  const ev = { ts, contactId, text: String(text || '').slice(0, 500), score: s.score, label: s.label };
  state.events.push(ev);
  if (state.events.length > 5000) state.events = state.events.slice(-5000);
  save(tenantId, state);
  return ev;
}

function windowStats(tenantId, { sinceMs = 24 * 60 * 60 * 1000, now = Date.now() } = {}) {
  const state = load(tenantId);
  const from = now - sinceMs;
  const evs = state.events.filter(e => e.ts >= from);
  const n = evs.length;
  const avg = n ? evs.reduce((a, e) => a + e.score, 0) / n : 0;
  const counts = { positive: 0, neutral: 0, negative: 0 };
  for (const e of evs) counts[e.label]++;
  const negRate = n ? counts.negative / n : 0;
  return { count: n, avgScore: Number(avg.toFixed(3)), counts, negRate: Number(negRate.toFixed(3)) };
}

function detectSpike(tenantId, { now = Date.now(), windowMs = 60 * 60 * 1000, baselineMs = 24 * 60 * 60 * 1000, negRateThreshold = 0.4, minSample = 5 } = {}) {
  const recent = windowStats(tenantId, { sinceMs: windowMs, now });
  const baseline = windowStats(tenantId, { sinceMs: baselineMs, now });
  const spike = recent.count >= minSample && recent.negRate >= negRateThreshold && recent.negRate > baseline.negRate;
  return {
    spike,
    recent,
    baseline,
    reason: spike ? ('Negative rate ' + (recent.negRate * 100).toFixed(0) + '% over last ' + Math.round(windowMs / 60000) + 'm (baseline ' + (baseline.negRate * 100).toFixed(0) + '%)') : null
  };
}

async function summarize(tenantId, opts = {}) {
  const stats = windowStats(tenantId, opts);
  const spike = detectSpike(tenantId, opts);
  const fallback = (spike.spike ? 'ALERT: ' + spike.reason + '. ' : '') +
    'Last window: ' + stats.count + ' msgs, avg sentiment ' + stats.avgScore +
    ' (' + stats.counts.positive + ' pos / ' + stats.counts.neutral + ' neu / ' + stats.counts.negative + ' neg).';
  if (!processPrompt) return { summary: fallback, ai: false, stats, spike };
  try {
    const prompt = 'You are a CX analyst. In 2 short sentences, summarize customer sentiment trend from this JSON and recommend one action. JSON: ' + JSON.stringify({ stats, spike });
    const out = await processPrompt({ prompt, system: 'Be concise. Plain text only.' });
    const txt = (out && (out.text || out.content || out.response)) || '';
    return { summary: txt.trim() || fallback, ai: Boolean(txt.trim()), stats, spike };
  } catch (_) {
    return { summary: fallback, ai: false, stats, spike };
  }
}

module.exports = { scoreText, record, windowStats, detectSpike, summarize, _DATA_DIR: DATA_DIR };
