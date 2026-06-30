// lib/llmOps/llmOps.js
// ────────────────────────────────────────────────────────────────────
// Local LLM Ops. The whole AI suite runs on one self-hosted Ollama box — if it
// stalls or the model gets evicted, everything degrades. This is the ops layer:
//   - health: is Ollama reachable, which models are loaded, how warm is it
//   - metrics: per-call latency / tokens / provider / success, with rollups
//   - failover: callWithFailover() tries LOCAL first, then cloud providers
//   - keep-warm: ping the model so it stays resident (pairs with OLLAMA_KEEP_ALIVE)
//
// All on-prem, file-backed metrics, zero new npm dependencies.
// ────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

let processPrompt;
try { ({ processPrompt } = require('../../ai/aiBrain')); }
catch (e) { console.warn('[llmOps] aiBrain unavailable:', e.message); processPrompt = null; }

const OLLAMA_HOST = () => process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const PRIMARY_MODEL = () => process.env.SUPPORT_AGENT_MODEL || 'qwen2.5:32b';
// comma-separated fallback providers the AI Brain Bridge understands, e.g. "groq,openai"
const FAILOVER_PROVIDERS = () => (process.env.LLM_FAILOVER_PROVIDERS || '').split(',').map(s => s.trim()).filter(Boolean);

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'llm_ops');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const metricsFile = path.join(DATA_DIR, 'metrics.json');

function readMetrics() { try { return fs.existsSync(metricsFile) ? JSON.parse(fs.readFileSync(metricsFile, 'utf8')) : []; } catch { return []; } }
function writeMetrics(m) { try { fs.writeFileSync(metricsFile, JSON.stringify(m.slice(-2000), null, 2)); } catch (e) { console.error('[llmOps] metrics write failed:', e.message); } }

/**
 * Record one LLM call's metrics. Called automatically by callWithFailover, but
 * also exported so other features can report their own calls.
 */
function record({ provider = 'ollama', model, latencyMs, tokens = null, success = true, fellBack = false, error = null } = {}) {
  const m = readMetrics();
  m.push({ provider, model: model || PRIMARY_MODEL(), latencyMs, tokens, success, fellBack, error, ts: Date.now() });
  writeMetrics(m);
}

// ── Health ───────────────────────────────────────────────────
async function status() {
  const host = OLLAMA_HOST();
  const out = { host, reachable: false, loadedModels: [], availableModels: [], primaryModel: PRIMARY_MODEL(), primaryLoaded: false };
  try {
    const tags = await fetch(`${host}/api/tags`, { method: 'GET' });
    if (tags.ok) {
      out.reachable = true;
      const data = await tags.json();
      out.availableModels = (data.models || []).map(m => m.name || m.model).filter(Boolean);
    }
  } catch { /* unreachable */ }
  // currently-loaded (warm) models via /api/ps when supported
  try {
    const ps = await fetch(`${host}/api/ps`, { method: 'GET' });
    if (ps.ok) {
      const data = await ps.json();
      out.loadedModels = (data.models || []).map(m => m.name || m.model).filter(Boolean);
      out.primaryLoaded = out.loadedModels.some(n => n && n.startsWith(PRIMARY_MODEL().split(':')[0]));
    }
  } catch { /* /api/ps may not exist on older builds */ }
  return out;
}

// ── Metrics rollups ───────────────────────────────────────────
function percentile(sorted, p) {
  if (!sorted.length) return null;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

function metrics({ sinceHours = 24 } = {}) {
  const since = Date.now() - sinceHours * 3600 * 1000;
  const rows = readMetrics().filter(r => r.ts >= since);
  const total = rows.length;
  const ok = rows.filter(r => r.success).length;
  const fellBack = rows.filter(r => r.fellBack).length;
  const lat = rows.filter(r => typeof r.latencyMs === 'number').map(r => r.latencyMs).sort((a, b) => a - b);
  const byProvider = rows.reduce((a, r) => { a[r.provider] = (a[r.provider] || 0) + 1; return a; }, {});
  const tokenSum = rows.reduce((a, r) => a + (r.tokens || 0), 0);
  return {
    windowHours: sinceHours,
    calls: total,
    successRate: total ? +(ok / total).toFixed(3) : null,
    failoverRate: total ? +(fellBack / total).toFixed(3) : null,
    latencyMs: { p50: percentile(lat, 50), p95: percentile(lat, 95), max: lat.length ? lat[lat.length - 1] : null },
    byProvider,
    tokensTotal: tokenSum
  };
}

// ── Failover-aware call ────────────────────────────────────────
/**
 * Generate via local Ollama first; on failure, walk LLM_FAILOVER_PROVIDERS.
 * Uses the AI Brain Bridge (processPrompt) which already understands providers.
 * Records metrics for every attempt. Returns { text, provider, fellBack, latencyMs }.
 */
async function callWithFailover(prompt, { model, providers } = {}) {
  if (!processPrompt) throw new Error('AI Brain Bridge unavailable');
  const chain = ['ollama', ...(providers || FAILOVER_PROVIDERS())];
  let lastErr = null;
  let fellBack = false;

  for (let i = 0; i < chain.length; i++) {
    const provider = chain[i];
    const start = Date.now();
    try {
      // The AI Brain Bridge reads provider/model from settings/env; we pass model
      // and let provider override happen via options where supported.
      const opts = { model: model || PRIMARY_MODEL(), provider };
      const raw = await processPrompt(prompt, opts);
      const latencyMs = Date.now() - start;
      const unconfigured = typeof raw === 'string' && /\[AI Assist\]|Connect your .* in the environment/i.test(raw);
      if (!raw || unconfigured) throw new Error('provider returned no usable output');
      record({ provider, model: opts.model, latencyMs, tokens: estimateTokens(raw), success: true, fellBack });
      return { text: String(raw), provider, fellBack, latencyMs };
    } catch (err) {
      const latencyMs = Date.now() - start;
      record({ provider, model: model || PRIMARY_MODEL(), latencyMs, success: false, fellBack, error: err.message });
      lastErr = err;
      fellBack = true; // any subsequent success is a fallback
    }
  }
  throw new Error(`all providers failed: ${lastErr ? lastErr.message : 'unknown'}`);
}

function estimateTokens(text) { return Math.ceil(String(text).length / 4); } // rough

// ── Keep-warm ───────────────────────────────────────────────
async function keepWarm({ model } = {}) {
  const host = OLLAMA_HOST();
  const m = model || PRIMARY_MODEL();
  const start = Date.now();
  try {
    // a tiny generate with keep_alive=-1 keeps the model resident
    const res = await fetch(`${host}/api/generate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: m, prompt: 'ok', stream: false, keep_alive: -1, options: { num_predict: 1 } })
    });
    const latencyMs = Date.now() - start;
    if (!res.ok) { record({ provider: 'ollama', model: m, latencyMs, success: false, error: `warm HTTP ${res.status}` }); return { warmed: false, status: res.status, latencyMs }; }
    record({ provider: 'ollama', model: m, latencyMs, success: true });
    return { warmed: true, latencyMs };
  } catch (err) {
    record({ provider: 'ollama', model: m, latencyMs: Date.now() - start, success: false, error: err.message });
    return { warmed: false, error: err.message };
  }
}

async function health() {
  const s = await status();
  return { ok: true, brainBridge: Boolean(processPrompt), primaryModel: PRIMARY_MODEL(), reachable: s.reachable, primaryLoaded: s.primaryLoaded, failoverProviders: FAILOVER_PROVIDERS() };
}

module.exports = { status, metrics, record, callWithFailover, keepWarm, health, _internal: { percentile, estimateTokens } };
