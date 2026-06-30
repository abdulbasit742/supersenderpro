// lib/leadQualify/leadQualify.js
// ────────────────────────────────────────────────────────────────────
// AI Conversational Lead Qualification. A flood of inbound leads is useless if
// you can\'t tell the tyre-kickers from the buyers. This qualifies a lead through
// a short guided chat — capturing NEED, BUDGET, TIMELINE, and AUTHORITY (a
// BANT-style frame) — then scores fit 0-100 and routes: high-fit leads get handed
// to a human (team inbox #74) immediately, the rest go to nurture.
//
// The flow + scoring are deterministic; the AI Brain Bridge (self-hosted Ollama)
// only phrases the next question and extracts a clean value from a free-text
// reply. Pushes signals to lead-intel (#11). File-backed. Zero new npm deps.
// ────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

let processPrompt;
try { ({ processPrompt } = require('../../ai/aiBrain')); }
catch (e) { console.warn('[leadQualify] aiBrain unavailable:', e.message); processPrompt = null; }

const MODEL = () => process.env.QUALIFY_MODEL || process.env.SUPPORT_AGENT_MODEL || 'qwen2.5:32b';

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'lead_qualify');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const sessFile = (storeId) => path.join(DATA_DIR, `${storeId}_sessions.json`);
const configFile = (storeId) => path.join(DATA_DIR, `${storeId}_config.json`);

function readJSON(p, fb) { try { return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : fb; } catch { return fb; } }
function writeJSON(p, d) { try { fs.writeFileSync(p, JSON.stringify(d, null, 2)); } catch (e) { console.error('[leadQualify] write failed:', e.message); } }
function readSess(storeId) { return readJSON(sessFile(storeId), {}); }
function writeSess(storeId, d) { writeJSON(sessFile(storeId), d); }

// The qualification frame. Each slot has a question + a deterministic scorer.
const DEFAULT_CONFIG = {
  hotThreshold: 70,      // score >= this -> route to human now
  questions: [
    { key: 'need', q: 'What are you looking for / what problem are you trying to solve?' },
    { key: 'budget', q: 'Do you have a budget range in mind?' },
    { key: 'timeline', q: 'When are you hoping to get this done? (today / this week / just exploring)' },
    { key: 'authority', q: 'Is this for yourself, or are you buying for a business/someone else?' }
  ]
};
function getConfig(storeId) { return readJSON(configFile(storeId), JSON.parse(JSON.stringify(DEFAULT_CONFIG))); }
function setConfig(storeId, updates = {}) { const m = { ...getConfig(storeId), ...updates }; if (updates.questions) m.questions = updates.questions; writeJSON(configFile(storeId), m); return m; }

// ── Deterministic per-answer scoring ────────────────────────────────
function scoreAnswer(key, text) {
  const t = String(text || '').toLowerCase();
  if (key === 'need') {
    // specific need (mentions a product/use) scores higher than vague
    if (t.length > 25 || /\b(need|want|looking for|buy|order|chahiye)\b/.test(t)) return 25;
    if (t.length > 5) return 12;
    return 4;
  }
  if (key === 'budget') {
    if (/\b\d{3,}\b/.test(t) || /budget|paisa|range|upto|under|around/.test(t)) return 25;
    if (/no|nahi|not sure|don'?t know|pata nahi/.test(t)) return 5;
    return 10;
  }
  if (key === 'timeline') {
    if (/today|now|aaj|abhi|urgent|asap|jaldi/.test(t)) return 25;
    if (/week|days|soon|hafta|jald/.test(t)) return 18;
    if (/month|later|baad/.test(t)) return 8;
    if (/explor|just looking|dekh rah|browsing/.test(t)) return 3;
    return 8;
  }
  if (key === 'authority') {
    if (/business|company|shop|store|reseller|bulk|wholesale|office/.test(t)) return 25;
    if (/myself|personal|khud|apne/.test(t)) return 12;
    return 8;
  }
  return 5;
}
function band(score) { return score >= 70 ? 'hot' : score >= 45 ? 'warm' : score >= 20 ? 'cool' : 'cold'; }

// ── AI helpers (phrase question / extract value) ───────────────────────
async function phraseQuestion(q, priorAnswers) {
  if (!processPrompt) return q;
  try {
    const raw = await processPrompt(['Rephrase this lead-qualification question as ONE warm, natural WhatsApp line (not an interrogation).', `Question: ${q}`, 'Return ONLY the line.'].join('\n'), { model: MODEL() });
    if (!raw || /\[AI Assist\]|Connect your .* in the environment/i.test(raw)) return q;
    return String(raw).trim().replace(/^"|"$/g, '');
  } catch { return q; }
}

// ── Flow ───────────────────────────────────────────────────
async function start({ storeId = 'default_store', phone } = {}) {
  if (!phone) throw new Error('phone is required');
  const cfg = getConfig(storeId);
  const sess = readSess(storeId);
  sess[phone] = { phone, step: 0, answers: {}, score: 0, status: 'active', startedAt: Date.now() };
  writeSess(storeId, sess);
  return { ok: true, done: false, question: await phraseQuestion(cfg.questions[0].q), key: cfg.questions[0].key, step: 0, total: cfg.questions.length };
}

async function answer({ storeId = 'default_store', phone, text } = {}) {
  if (!phone) throw new Error('phone is required');
  const cfg = getConfig(storeId);
  const sess = readSess(storeId); const s = sess[phone];
  if (!s || s.status !== 'active') return { ok: false, error: 'no active qualification session' };
  const cur = cfg.questions[s.step];
  s.answers[cur.key] = String(text || '').trim();
  s.score += scoreAnswer(cur.key, text);
  s.step += 1;

  if (s.step >= cfg.questions.length) {
    s.status = 'completed'; s.completedAt = Date.now();
    const b = band(s.score);
    s.band = b;
    sess[phone] = s; writeSess(storeId, sess);
    // push a signal to lead-intel (#11) if present
    try { const li = require('../leadIntel/leadIntel'); if (li && li.scoreLead) li.scoreLead({ storeId, phone, signals: { hasOrderIntent: true, buyIntentHits: b === 'hot' ? 2 : 1 }, enrichAI: false }).catch(() => {}); } catch {}
    const hot = s.score >= cfg.hotThreshold;
    return { ok: true, done: true, score: s.score, band: b, hot, answers: s.answers, message: hot ? 'Thanks! You\'re all set \u2014 connecting you with someone who can help right away. \ud83d\ude4f' : 'Thanks for sharing! We\'ll be in touch with the right options for you.' };
  }
  sess[phone] = s; writeSess(storeId, sess);
  return { ok: true, done: false, question: await phraseQuestion(cfg.questions[s.step].q, s.answers), key: cfg.questions[s.step].key, step: s.step, total: cfg.questions.length };
}

function getSession({ storeId = 'default_store', phone } = {}) { return readSess(storeId)[phone] || null; }
function listSessions({ storeId = 'default_store', band: b, status } = {}) {
  let list = Object.values(readSess(storeId)).sort((a, c) => (c.score || 0) - (a.score || 0));
  if (b) list = list.filter(s => s.band === b);
  if (status) list = list.filter(s => s.status === status);
  return list;
}

function health() { return { ok: true, brainBridge: Boolean(processPrompt), model: MODEL() }; }

module.exports = { start, answer, getSession, listSessions, getConfig, setConfig, health, _internal: { scoreAnswer, band, DEFAULT_CONFIG } };
