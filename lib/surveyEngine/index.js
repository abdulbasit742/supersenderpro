'use strict';
/**
 * AI Survey + NPS/CSAT Engine (#145)
 * --------------------------------------------------------------
 * Deterministic core: build surveys from templates, schedule sends,
 * collect responses, compute NPS / CSAT / CES. The LLM is OPTIONAL and
 * only used to cluster + summarise free-text verbatims into themes.
 *
 * Conventions honoured:
 *  - Self-hosted first: AI via aiBrain/llmHub resolver; cloud fallback only.
 *  - Deterministic without a model; graceful template fallback always.
 *  - Zero new npm deps (Node built-ins + global fetch).
 *  - server.js never edited; router self-mounts.
 *  - File-backed JSON under data/survey/<tenant>/, tenant-scoped.
 *  - Missing tenantId throws.
 *  - DRY-RUN safe: never auto-sends WhatsApp.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(process.cwd(), 'data', 'survey');

// ---- tenant-scoped JSON store with mtime read-cache -------------------------
const _cache = new Map(); // file -> { mtimeMs, data }

function tenantDir(tenantId) {
  if (!tenantId) throw new Error('survey: tenantId is required');
  const safe = String(tenantId).replace(/[^a-zA-Z0-9_-]/g, '_');
  const dir = path.join(ROOT, safe);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function readJson(file, fallback) {
  try {
    const st = fs.statSync(file);
    const hit = _cache.get(file);
    if (hit && hit.mtimeMs === st.mtimeMs) return hit.data;
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    _cache.set(file, { mtimeMs: st.mtimeMs, data });
    return data;
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  try { _cache.set(file, { mtimeMs: fs.statSync(file).mtimeMs, data }); } catch {}
  return data;
}

function surveysFile(tenantId) { return path.join(tenantDir(tenantId), 'surveys.json'); }
function responsesFile(tenantId) { return path.join(tenantDir(tenantId), 'responses.json'); }

// ---- privacy helpers --------------------------------------------------------
function maskPhone(p) {
  if (!p) return p;
  const s = String(p).replace(/[^0-9+]/g, '');
  if (s.length <= 4) return '****';
  return s.slice(0, 3) + '****' + s.slice(-2);
}

function id(prefix) {
  return prefix + '_' + crypto.randomBytes(6).toString('hex');
}

// ---- survey templates -------------------------------------------------------
const TEMPLATES = {
  nps: {
    type: 'nps',
    scale: [0, 10],
    question: 'Aap humein 0-10 mein kitne chances pe kisi dost ko recommend karenge? (0 = bilkul nahi, 10 = zaroor)',
    followup: 'Shukriya! Aap ne ye score kyun diya? (optional)'
  },
  csat: {
    type: 'csat',
    scale: [1, 5],
    question: 'Aaj ki service ko 1-5 mein rate karein (1 = bura, 5 = behtareen).',
    followup: 'Koi behtari ka mashwara? (optional)'
  },
  ces: {
    type: 'ces',
    scale: [1, 7],
    question: 'Aapka masla hal karna kitna aasan tha? 1 (bohat mushkil) - 7 (bohat aasan).',
    followup: 'Kahan mushkil hui? (optional)'
  }
};

// ---- create / list surveys --------------------------------------------------
function createSurvey(tenantId, { name, template = 'nps', question, followup, audience = [] } = {}) {
  if (!name) throw new Error('survey: name required');
  const tpl = TEMPLATES[template];
  if (!tpl) throw new Error('survey: unknown template ' + template);
  const file = surveysFile(tenantId);
  const all = readJson(file, []);
  const survey = {
    id: id('svy'),
    name,
    type: tpl.type,
    scale: tpl.scale,
    question: question || tpl.question,
    followup: followup || tpl.followup,
    audience: Array.isArray(audience) ? audience : [],
    createdAt: new Date().toISOString(),
    status: 'draft'
  };
  all.push(survey);
  writeJson(file, all);
  return survey;
}

function listSurveys(tenantId) {
  return readJson(surveysFile(tenantId), []);
}

function getSurvey(tenantId, surveyId) {
  return listSurveys(tenantId).find(s => s.id === surveyId) || null;
}

// ---- schedule (DRY-RUN: builds the send plan, never sends) ------------------
function scheduleSurvey(tenantId, surveyId, { dryRun = true } = {}) {
  const file = surveysFile(tenantId);
  const all = readJson(file, []);
  const svy = all.find(s => s.id === surveyId);
  if (!svy) throw new Error('survey: not found ' + surveyId);
  const plan = (svy.audience || []).map(p => ({
    to: maskPhone(p),
    text: svy.question,
    dryRun
  }));
  if (!dryRun) svy.status = 'live';
  svy.scheduledAt = new Date().toISOString();
  writeJson(file, all);
  return { surveyId, count: plan.length, dryRun, plan };
}

// ---- record a response ------------------------------------------------------
function recordResponse(tenantId, surveyId, { phone, score, comment } = {}) {
  const svy = getSurvey(tenantId, surveyId);
  if (!svy) throw new Error('survey: not found ' + surveyId);
  const [lo, hi] = svy.scale;
  const n = Number(score);
  if (!Number.isFinite(n) || n < lo || n > hi) {
    throw new Error('survey: score must be ' + lo + '-' + hi);
  }
  const file = responsesFile(tenantId);
  const all = readJson(file, []);
  const rec = {
    id: id('resp'),
    surveyId,
    phone: maskPhone(phone),
    score: n,
    comment: (comment || '').slice(0, 500),
    at: new Date().toISOString()
  };
  all.push(rec);
  writeJson(file, all);
  return rec;
}

// ---- scoring ----------------------------------------------------------------
function npsBucket(score) {
  if (score >= 9) return 'promoter';
  if (score >= 7) return 'passive';
  return 'detractor';
}

function score(tenantId, surveyId) {
  const svy = getSurvey(tenantId, surveyId);
  if (!svy) throw new Error('survey: not found ' + surveyId);
  const resp = readJson(responsesFile(tenantId), []).filter(r => r.surveyId === surveyId);
  const n = resp.length;
  const out = { surveyId, type: svy.type, responses: n };
  if (n === 0) return Object.assign(out, { score: null, note: 'no responses yet' });

  if (svy.type === 'nps') {
    const buckets = { promoter: 0, passive: 0, detractor: 0 };
    resp.forEach(r => { buckets[npsBucket(r.score)]++; });
    const nps = Math.round(((buckets.promoter - buckets.detractor) / n) * 100);
    return Object.assign(out, { score: nps, range: '-100..100', buckets });
  }
  // csat / ces -> average + % top-box
  const sum = resp.reduce((a, r) => a + r.score, 0);
  const avg = +(sum / n).toFixed(2);
  const [, hi] = svy.scale;
  const topBox = resp.filter(r => r.score >= hi - 1).length;
  const topPct = Math.round((topBox / n) * 100);
  return Object.assign(out, { score: avg, topBoxPct: topPct, scale: svy.scale });
}

// ---- AI verbatim theming (OPTIONAL: Ollama via aiBrain/llmHub) --------------
function resolveBrain() {
  const tries = ['../llmHub', '../../lib/llmHub', '../aiAgent', '../aiBrain', './aiBrain'];
  for (const t of tries) {
    try {
      const m = require(t);
      if (m && (m.processPrompt || m.complete || m.chat)) return m;
    } catch {}
  }
  return null;
}

function templateThemes(comments) {
  // deterministic keyword clustering, no model needed
  const KW = {
    delivery: ['deliver', 'shipping', 'late', 'der', 'courier', 'parcel'],
    price: ['price', 'mehnga', 'expensive', 'cost', 'paisa'],
    quality: ['quality', 'kharab', 'broken', 'achi', 'achha', 'defect'],
    support: ['support', 'reply', 'jawab', 'rude', 'helpful', 'staff'],
    product: ['product', 'item', 'cheez', 'size', 'color']
  };
  const counts = {};
  for (const c of comments) {
    const low = (c || '').toLowerCase();
    for (const [theme, kws] of Object.entries(KW)) {
      if (kws.some(k => low.includes(k))) counts[theme] = (counts[theme] || 0) + 1;
    }
  }
  const themes = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([theme, count]) => ({ theme, count }));
  return { themes, method: 'template' };
}

async function summarizeVerbatims(tenantId, surveyId) {
  const resp = readJson(responsesFile(tenantId), []).filter(r => r.surveyId === surveyId);
  const comments = resp.map(r => r.comment).filter(Boolean);
  if (comments.length === 0) return { themes: [], method: 'none', note: 'no comments' };

  const base = templateThemes(comments);
  const brain = resolveBrain();
  if (!brain) return base;

  const prompt = 'You are a CX analyst. Cluster these customer survey comments into at most 5 short themes ' +
    'with a one-line summary each. Return concise plain text.\n\nComments:\n- ' +
    comments.slice(0, 100).join('\n- ');
  try {
    const fn = brain.processPrompt || brain.complete || brain.chat;
    const res = await fn.call(brain, prompt, { maxTokens: 400, temperature: 0.2 });
    const text = typeof res === 'string' ? res : (res && (res.text || res.content)) || '';
    if (text && text.trim()) {
      return { themes: base.themes, summary: text.trim(), method: 'ollama' };
    }
  } catch {
    /* graceful fallback to template */
  }
  return base;
}

module.exports = {
  TEMPLATES,
  createSurvey,
  listSurveys,
  getSurvey,
  scheduleSurvey,
  recordResponse,
  score,
  summarizeVerbatims,
  maskPhone
};
