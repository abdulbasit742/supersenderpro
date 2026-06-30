// lib/surveys/surveyEngine.js
// ────────────────────────────────────────────────────────────────────
// WhatsApp Survey & Poll Engine. Surveys, polls, and quizzes run beautifully in
// chat — one question at a time, reply to answer. This defines a survey
// (multiple-choice / rating / open-text steps), runs it conversationally per
// contact (ask -> validate the reply -> advance), stores responses, and rolls
// up results (answer distributions, average rating, NPS). The AI Brain Bridge
// (self-hosted Ollama) is used ONLY to summarize open-text themes + an insight.
//
// The conversational flow + answer validation are deterministic; nothing about
// collecting valid data needs a model. File-backed. Zero new npm dependencies.
// ────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

let processPrompt;
try { ({ processPrompt } = require('../../ai/aiBrain')); }
catch (e) { console.warn('[surveys] aiBrain unavailable:', e.message); processPrompt = null; }

const MODEL = () => process.env.SURVEY_MODEL || process.env.SUPPORT_AGENT_MODEL || 'qwen2.5:32b';

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'surveys');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const defFile = (storeId) => path.join(DATA_DIR, `${storeId}_surveys.json`);
const respFile = (storeId) => path.join(DATA_DIR, `${storeId}_responses.json`);
const sessFile = (storeId) => path.join(DATA_DIR, `${storeId}_sessions.json`);

function readJSON(p, fb) { try { return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : fb; } catch { return fb; } }
function writeJSON(p, d) { try { fs.writeFileSync(p, JSON.stringify(d, null, 2)); } catch (e) { console.error('[surveys] write failed:', e.message); } }

// step: { type:'choice'|'rating'|'text', q, options?(for choice), min?max?(rating, default 1..5) }
function defineSurvey({ storeId = 'default_store', id, name, steps = [] } = {}) {
  if (!id) throw new Error('id is required');
  if (!Array.isArray(steps) || !steps.length) throw new Error('steps (non-empty) required');
  const clean = steps.map((s, i) => {
    const type = ['choice', 'rating', 'text'].includes(s.type) ? s.type : 'text';
    const step = { idx: i, type, q: String(s.q || `Question ${i + 1}`) };
    if (type === 'choice') step.options = (s.options || []).map(String).slice(0, 10);
    if (type === 'rating') { step.min = s.min || 1; step.max = s.max || 5; step.nps = Boolean(s.nps); }
    return step;
  });
  const defs = readJSON(defFile(storeId), {});
  defs[id] = { id, name: name || id, steps: clean, createdAt: Date.now() };
  writeJSON(defFile(storeId), defs);
  return defs[id];
}
function getSurvey({ storeId = 'default_store', id } = {}) { return readJSON(defFile(storeId), {})[id] || null; }
function listSurveys({ storeId = 'default_store' } = {}) { return Object.values(readJSON(defFile(storeId), {})); }

// ── Sessions (per contact, per survey) ──────────────────────────────
function sessKey(phone, surveyId) { return `${phone}::${surveyId}`; }
function readSess(storeId) { return readJSON(sessFile(storeId), {}); }
function writeSess(storeId, d) { writeJSON(sessFile(storeId), d); }

function promptFor(step) {
  if (step.type === 'choice') return `${step.q}\n` + step.options.map((o, i) => `${i + 1}. ${o}`).join('\n') + `\n(Reply with the number.)`;
  if (step.type === 'rating') return `${step.q}\n(Reply ${step.min}-${step.max}.)`;
  return step.q;
}

/** Start (or restart) a survey for a contact. Returns the first question. */
function start({ storeId = 'default_store', phone, surveyId } = {}) {
  if (!phone || !surveyId) throw new Error('phone and surveyId are required');
  const survey = getSurvey({ storeId, id: surveyId });
  if (!survey) return { ok: false, error: 'unknown survey' };
  const sess = readSess(storeId);
  sess[sessKey(phone, surveyId)] = { phone, surveyId, step: 0, answers: [], status: 'active', startedAt: Date.now() };
  writeSess(storeId, sess);
  return { ok: true, done: false, question: promptFor(survey.steps[0]), step: 0, total: survey.steps.length };
}

// ── Answer validation (deterministic) ──────────────────────────────
function validate(step, text) {
  const t = String(text || '').trim();
  if (step.type === 'choice') {
    const n = parseInt(t, 10);
    if (!isNaN(n) && n >= 1 && n <= step.options.length) return { ok: true, value: step.options[n - 1] };
    // also accept the option text directly
    const match = step.options.find(o => o.toLowerCase() === t.toLowerCase());
    if (match) return { ok: true, value: match };
    return { ok: false, error: `Please reply with a number 1-${step.options.length}.` };
  }
  if (step.type === 'rating') {
    const n = parseInt((t.match(/-?\d+/) || [])[0], 10);
    if (!isNaN(n) && n >= step.min && n <= step.max) return { ok: true, value: n };
    return { ok: false, error: `Please reply with a number ${step.min}-${step.max}.` };
  }
  if (!t) return { ok: false, error: 'Please type your answer.' };
  return { ok: true, value: t };
}

/**
 * Submit an answer for a contact\'s active survey. Validates, advances, and
 * returns the next question or completion.
 */
function answer({ storeId = 'default_store', phone, surveyId, text } = {}) {
  if (!phone || !surveyId) throw new Error('phone and surveyId are required');
  const survey = getSurvey({ storeId, id: surveyId });
  if (!survey) return { ok: false, error: 'unknown survey' };
  const sess = readSess(storeId); const key = sessKey(phone, surveyId); const s = sess[key];
  if (!s || s.status !== 'active') return { ok: false, error: 'no active survey session' };
  const step = survey.steps[s.step];
  const v = validate(step, text);
  if (!v.ok) return { ok: true, done: false, reask: true, message: v.error, question: promptFor(step), step: s.step };

  s.answers.push({ idx: step.idx, type: step.type, q: step.q, value: v.value, nps: step.nps || false });
  s.step += 1;
  if (s.step >= survey.steps.length) {
    s.status = 'completed'; s.completedAt = Date.now();
    sess[key] = s; writeSess(storeId, sess);
    // persist the completed response
    const resp = readJSON(respFile(storeId), {}); resp[surveyId] = resp[surveyId] || []; resp[surveyId].push({ phone, answers: s.answers, completedAt: s.completedAt }); writeJSON(respFile(storeId), resp);
    return { ok: true, done: true, message: 'Thank you for completing the survey! \ud83d\ude4f' };
  }
  sess[key] = s; writeSess(storeId, sess);
  return { ok: true, done: false, question: promptFor(survey.steps[s.step]), step: s.step, total: survey.steps.length };
}

// ── Results rollup (deterministic) ─────────────────────────────────
function results({ storeId = 'default_store', surveyId } = {}) {
  const survey = getSurvey({ storeId, id: surveyId });
  if (!survey) return { ok: false, error: 'unknown survey' };
  const responses = (readJSON(respFile(storeId), {})[surveyId]) || [];
  const perQuestion = survey.steps.map(step => {
    const answers = responses.map(r => (r.answers.find(a => a.idx === step.idx) || {}).value).filter(v => v !== undefined);
    if (step.type === 'choice') {
      const dist = {}; for (const o of step.options) dist[o] = 0; for (const a of answers) dist[a] = (dist[a] || 0) + 1;
      return { q: step.q, type: 'choice', responses: answers.length, distribution: dist };
    }
    if (step.type === 'rating') {
      const nums = answers.map(Number).filter(n => !isNaN(n));
      const avg = nums.length ? +(nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2) : null;
      let nps = null;
      if (step.nps) { const prom = nums.filter(n => n >= 9).length, det = nums.filter(n => n <= 6).length; nps = nums.length ? Math.round((prom - det) / nums.length * 100) : null; }
      return { q: step.q, type: 'rating', responses: nums.length, avg, nps };
    }
    return { q: step.q, type: 'text', responses: answers.length, samples: answers.slice(0, 10) };
  });
  return { ok: true, surveyId, totalResponses: responses.length, perQuestion };
}

async function insights({ storeId = 'default_store', surveyId } = {}) {
  const r = results({ storeId, surveyId });
  if (!r.ok) return r;
  if (!processPrompt) return { ...r, insight: deterministicInsight(r), source: 'fallback' };
  try {
    const raw = await processPrompt(['Summarize this WhatsApp survey result for the business owner in 2-3 lines + one action.', JSON.stringify(r.perQuestion).slice(0, 2000), 'Be concrete. Return ONLY the summary.'].join('\n'), { model: MODEL() });
    if (!raw || /\[AI Assist\]|Connect your .* in the environment/i.test(raw)) return { ...r, insight: deterministicInsight(r), source: 'fallback' };
    return { ...r, insight: String(raw).trim(), source: 'ollama' };
  } catch { return { ...r, insight: deterministicInsight(r), source: 'fallback' }; }
}
function deterministicInsight(r) {
  const bits = [`${r.totalResponses} responses.`];
  for (const q of r.perQuestion) {
    if (q.type === 'rating' && q.avg != null) bits.push(`\"${q.q}\" avg ${q.avg}${q.nps != null ? `, NPS ${q.nps}` : ''}.`);
    if (q.type === 'choice' && q.responses) { const top = Object.entries(q.distribution).sort((a, b) => b[1] - a[1])[0]; if (top) bits.push(`\"${q.q}\": top answer \"${top[0]}\" (${top[1]}).`); }
  }
  return bits.join(' ');
}

function health() { return { ok: true, brainBridge: Boolean(processPrompt), model: MODEL() }; }

module.exports = { defineSurvey, getSurvey, listSurveys, start, answer, results, insights, health, _internal: { validate, promptFor, deterministicInsight } };
