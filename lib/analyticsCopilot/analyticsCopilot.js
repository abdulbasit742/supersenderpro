// lib/analyticsCopilot/analyticsCopilot.js
// ────────────────────────────────────────────────────────────────────
// Natural-language Analytics Copilot. Lets the founder/team ask business
// questions in plain English/Urdu ("how many hot leads this week?", "kitni sales
// hui?") and get a real answer computed from actual data.
//
// SAFETY-FIRST design: the model never writes code or SQL. Instead we expose a
// registry of vetted, deterministic METRIC FUNCTIONS. The AI Brain Bridge
// (self-hosted Ollama) is used only to (a) map the question to a metric id +
// args, and (b) phrase the final number into a sentence. Every actual
// computation is plain JS over data we already hold. If the model is offline we
// fall back to keyword metric matching and a templated answer.
//
// Metric providers are pluggable: register your own, or rely on the built-ins
// that read the lead-intel / intent-router / support-agent stores when present.
// Zero new npm dependencies.
// ────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

let processPrompt;
try { ({ processPrompt } = require('../../ai/aiBrain')); }
catch (e) { console.warn('[analyticsCopilot] aiBrain unavailable:', e.message); processPrompt = null; }

const MODEL = () => process.env.ANALYTICS_MODEL || process.env.SUPPORT_AGENT_MODEL || 'qwen2.5:32b';
const DATA_ROOT = path.join(__dirname, '..', '..', 'data');

function safeReadJSON(p, fallback) {
  try { return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : fallback; } catch { return fallback; }
}

// ── Metric registry ──────────────────────────────────────────────
// Each metric: { id, description, keywords, run(args, ctx) -> { value, unit?, detail? } }
const REGISTRY = new Map();
function registerMetric(def) {
  if (!def || !def.id || typeof def.run !== 'function') throw new Error('metric needs id + run()');
  REGISTRY.set(def.id, { keywords: [], description: '', ...def });
  return def.id;
}
function listMetrics() {
  return [...REGISTRY.values()].map(m => ({ id: m.id, description: m.description, keywords: m.keywords }));
}

// ── Built-in metrics (read existing feature stores; degrade to 0 if absent) ──
function leadScores(storeId) {
  return Object.values(safeReadJSON(path.join(DATA_ROOT, 'lead_intel', `${storeId}_scores.json`), {}));
}

registerMetric({
  id: 'hot_leads_count', description: 'Number of leads currently scored "hot"',
  keywords: ['hot', 'lead', 'leads', 'hot leads'],
  run: (_args, ctx) => {
    const n = leadScores(ctx.storeId).filter(l => l.band === 'hot').length;
    return { value: n, unit: 'leads' };
  }
});
registerMetric({
  id: 'leads_by_band', description: 'Breakdown of leads by band (hot/warm/cold/dormant)',
  keywords: ['leads', 'band', 'breakdown', 'pipeline', 'how many leads'],
  run: (_args, ctx) => {
    const by = leadScores(ctx.storeId).reduce((a, l) => { a[l.band] = (a[l.band] || 0) + 1; return a; }, {});
    return { value: by, unit: 'leads', detail: by };
  }
});
registerMetric({
  id: 'at_risk_count', description: 'Number of at-risk customers (negative signals)',
  keywords: ['at risk', 'at-risk', 'risk', 'churn', 'unhappy', 'angry'],
  run: (_args, ctx) => ({ value: leadScores(ctx.storeId).filter(l => l.atRisk).length, unit: 'customers' })
});
registerMetric({
  id: 'top_next_actions', description: 'Top recommended next-best-actions across hot/warm leads',
  keywords: ['next action', 'next best', 'what should i do', 'recommend', 'todo'],
  run: (_args, ctx) => {
    const acts = leadScores(ctx.storeId)
      .filter(l => l.nextBestAction && (l.band === 'hot' || l.band === 'warm'))
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 5)
      .map(l => ({ phone: l.phone, score: l.score, action: l.nextBestAction }));
    return { value: acts.length, unit: 'actions', detail: acts };
  }
});
registerMetric({
  id: 'media_jobs_count', description: 'Number of AI media generations',
  keywords: ['media', 'images', 'generated', 'pictures', 'creatives'],
  run: () => ({ value: safeReadJSON(path.join(DATA_ROOT, 'generated_media', '_jobs.json'), []).length, unit: 'images' })
});
registerMetric({
  id: 'voice_notes_count', description: 'Number of voice notes processed',
  keywords: ['voice', 'voice notes', 'audio', 'transcribed'],
  run: () => ({ value: safeReadJSON(path.join(DATA_ROOT, 'voice_notes', '_jobs.json'), []).length, unit: 'voice notes' })
});

// ── Question -> metric resolution ──────────────────────────────────
function matchMetricKeyword(question) {
  const q = String(question).toLowerCase();
  let best = null, bestScore = 0;
  for (const m of REGISTRY.values()) {
    const score = (m.keywords || []).reduce((n, k) => n + (q.includes(k.toLowerCase()) ? k.length : 0), 0);
    if (score > bestScore) { best = m; bestScore = score; }
  }
  return best ? best.id : null;
}

async function matchMetricAI(question) {
  if (!processPrompt) return null;
  const catalog = [...REGISTRY.values()].map(m => `- ${m.id}: ${m.description}`).join('\n');
  const prompt = [
    'Pick the single best metric id to answer the question. Reply with ONLY the id, or NONE.',
    'Available metrics:', catalog, '', `Question: "${question}"`
  ].join('\n');
  try {
    const raw = await processPrompt(prompt, { model: MODEL() });
    if (!raw || /\[AI Assist\]|Connect your .* in the environment/i.test(raw)) return null;
    const id = String(raw).trim().split(/\s|\n/)[0].replace(/[^a-z_]/gi, '');
    return REGISTRY.has(id) ? id : null;
  } catch { return null; }
}

async function phraseAnswer(question, metric, result) {
  const valueStr = typeof result.value === 'object' ? JSON.stringify(result.value) : `${result.value}${result.unit ? ' ' + result.unit : ''}`;
  if (!processPrompt) return `${metric.description}: ${valueStr}.`;
  const prompt = [
    'Answer the user\'s question in ONE short, friendly sentence using the computed value. Do not invent numbers.',
    `Question: "${question}"`,
    `Metric: ${metric.description}`,
    `Computed value: ${valueStr}`,
    result.detail ? `Detail: ${JSON.stringify(result.detail).slice(0, 500)}` : '',
    '', 'Answer:'
  ].filter(Boolean).join('\n');
  try {
    const raw = await processPrompt(prompt, { model: MODEL() });
    if (!raw || /\[AI Assist\]|Connect your .* in the environment/i.test(raw)) return `${metric.description}: ${valueStr}.`;
    return String(raw).trim();
  } catch { return `${metric.description}: ${valueStr}.`; }
}

/**
 * Ask a question in natural language.
 * @returns {Promise<{ question, metricId, value, unit, detail, answer, method, source }>}
 */
async function ask({ storeId = 'default_store', question, useAI = true } = {}) {
  if (!question || !String(question).trim()) throw new Error('question is required');

  let metricId = matchMetricKeyword(question);
  let method = 'keyword';
  if (!metricId && useAI) { const ai = await matchMetricAI(question); if (ai) { metricId = ai; method = 'ai'; } }

  if (!metricId) {
    return {
      question, metricId: null, value: null,
      answer: "I couldn't map that to a known metric. Try asking about leads, at-risk customers, media, or voice notes.",
      available: listMetrics().map(m => m.id), method: 'none', source: 'none'
    };
  }

  const metric = REGISTRY.get(metricId);
  let result;
  try { result = await metric.run({}, { storeId }); }
  catch (e) { return { question, metricId, value: null, answer: `Failed to compute ${metricId}: ${e.message}`, method, source: 'error' }; }

  const answer = useAI ? await phraseAnswer(question, metric, result) : `${metric.description}: ${typeof result.value === 'object' ? JSON.stringify(result.value) : result.value}`;
  return { question, metricId, value: result.value, unit: result.unit, detail: result.detail || null, answer, method, source: processPrompt ? 'ollama' : 'fallback' };
}

function health() {
  return { ok: true, brainBridge: Boolean(processPrompt), model: MODEL(), metricCount: REGISTRY.size, metrics: [...REGISTRY.keys()] };
}

module.exports = { ask, registerMetric, listMetrics, health, _internal: { matchMetricKeyword, REGISTRY } };
