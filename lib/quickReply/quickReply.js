// lib/quickReply/quickReply.js
// Quick-Reply / Canned Response Manager (feature #118)
// Deterministic core: store, search, render canned replies with variables + shortcuts.
// Optional AI: best-effort suggestion of a reply for an incoming message, with template fallback.
// Zero new deps. File-backed under data/. Tenant-scoped (missing tenantId throws).

'use strict';

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data', 'quickReply');

function ensureDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function requireTenant(tenantId) {
  if (!tenantId || typeof tenantId !== 'string') {
    throw new Error('tenantId is required');
  }
  return tenantId;
}

function storeFile(tenantId) {
  requireTenant(tenantId);
  ensureDir();
  const safe = tenantId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(DATA_DIR, safe + '.json');
}

function loadAll(tenantId) {
  const file = storeFile(tenantId);
  if (!fs.existsSync(file)) return [];
  try {
    const raw = fs.readFileSync(file, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function saveAll(tenantId, list) {
  const file = storeFile(tenantId);
  fs.writeFileSync(file, JSON.stringify(list, null, 2), 'utf8');
  return list;
}

function genId() {
  return 'qr_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function normalizeShortcut(s) {
  if (!s) return '';
  let v = String(s).trim().toLowerCase();
  if (v[0] !== '/') v = '/' + v;
  return v.replace(/\s+/g, '-');
}

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

// --- CRUD ---

function create(tenantId, input) {
  requireTenant(tenantId);
  if (!input || !input.body) throw new Error('body is required');
  const list = loadAll(tenantId);
  const item = {
    id: genId(),
    title: input.title || (String(input.body).slice(0, 40)),
    body: String(input.body),
    shortcut: normalizeShortcut(input.shortcut),
    triggers: Array.isArray(input.triggers) ? input.triggers.map(function (t) { return String(t).toLowerCase(); }) : [],
    tags: Array.isArray(input.tags) ? input.tags.map(String) : [],
    uses: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  list.push(item);
  saveAll(tenantId, list);
  return item;
}

function update(tenantId, id, patch) {
  requireTenant(tenantId);
  const list = loadAll(tenantId);
  const idx = list.findIndex(function (x) { return x.id === id; });
  if (idx === -1) throw new Error('not found: ' + id);
  const cur = list[idx];
  if (patch.title != null) cur.title = String(patch.title);
  if (patch.body != null) cur.body = String(patch.body);
  if (patch.shortcut != null) cur.shortcut = normalizeShortcut(patch.shortcut);
  if (patch.triggers != null) cur.triggers = (patch.triggers || []).map(function (t) { return String(t).toLowerCase(); });
  if (patch.tags != null) cur.tags = (patch.tags || []).map(String);
  cur.updatedAt = new Date().toISOString();
  list[idx] = cur;
  saveAll(tenantId, list);
  return cur;
}

function remove(tenantId, id) {
  requireTenant(tenantId);
  const list = loadAll(tenantId);
  const next = list.filter(function (x) { return x.id !== id; });
  saveAll(tenantId, next);
  return { removed: list.length - next.length };
}

function get(tenantId, id) {
  requireTenant(tenantId);
  return loadAll(tenantId).find(function (x) { return x.id === id; }) || null;
}

function list(tenantId) {
  requireTenant(tenantId);
  return loadAll(tenantId);
}

// --- Variable rendering ---
// Replaces {{name}} style tokens from vars; unknown tokens left blank.
function render(item, vars) {
  vars = vars || {};
  return String(item.body).replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, function (_, key) {
    return vars[key] != null ? String(vars[key]) : '';
  });
}

// --- Lookup by shortcut ---
function byShortcut(tenantId, shortcut) {
  requireTenant(tenantId);
  const sc = normalizeShortcut(shortcut);
  return loadAll(tenantId).find(function (x) { return x.shortcut === sc; }) || null;
}

// --- Deterministic search/suggest by trigger + keyword overlap ---
function suggest(tenantId, incomingText, opts) {
  requireTenant(tenantId);
  opts = opts || {};
  const limit = opts.limit || 3;
  const tokens = tokenize(incomingText);
  const tokenSet = {};
  tokens.forEach(function (t) { tokenSet[t] = true; });

  const scored = loadAll(tenantId).map(function (item) {
    let score = 0;
    // strong signal: explicit trigger phrase present
    (item.triggers || []).forEach(function (trig) {
      if (incomingText && String(incomingText).toLowerCase().indexOf(trig) !== -1) score += 5;
    });
    // keyword overlap between message and title/body/tags
    const hay = tokenize((item.title || '') + ' ' + (item.body || '') + ' ' + (item.tags || []).join(' '));
    hay.forEach(function (w) { if (tokenSet[w]) score += 1; });
    // tie-breaker: popularity
    score += Math.min((item.uses || 0) * 0.01, 1);
    return { item: item, score: score };
  })
  .filter(function (s) { return s.score > 0; })
  .sort(function (a, b) { return b.score - a.score; })
  .slice(0, limit);

  return scored.map(function (s) { return { id: s.item.id, title: s.item.title, body: s.item.body, score: Number(s.score.toFixed(2)) }; });
}

// --- Mark usage (analytics) ---
function markUsed(tenantId, id) {
  requireTenant(tenantId);
  const list = loadAll(tenantId);
  const idx = list.findIndex(function (x) { return x.id === id; });
  if (idx === -1) throw new Error('not found: ' + id);
  list[idx].uses = (list[idx].uses || 0) + 1;
  list[idx].lastUsedAt = new Date().toISOString();
  saveAll(tenantId, list);
  return list[idx];
}

function analytics(tenantId) {
  requireTenant(tenantId);
  const all = loadAll(tenantId);
  const totalUses = all.reduce(function (a, x) { return a + (x.uses || 0); }, 0);
  const top = all.slice().sort(function (a, b) { return (b.uses || 0) - (a.uses || 0); }).slice(0, 5)
    .map(function (x) { return { id: x.id, title: x.title, uses: x.uses || 0 }; });
  return { total: all.length, totalUses: totalUses, top: top };
}

// --- Optional AI enrichment: best-effort, graceful fallback ---
async function aiSuggest(tenantId, incomingText, opts) {
  requireTenant(tenantId);
  opts = opts || {};
  const candidates = suggest(tenantId, incomingText, { limit: opts.limit || 3 });
  // Deterministic answer always available.
  const base = { source: 'deterministic', candidates: candidates };
  if (opts.useAI === false) return base;

  try {
    const brain = require('../../ai/aiBrain');
    if (!brain || typeof brain.processPrompt !== 'function') return base;
    const menu = candidates.map(function (c, i) { return (i + 1) + '. ' + c.title + ': ' + c.body; }).join('\n');
    const prompt = 'You are a support agent. Customer said: "' + String(incomingText) + '".\n' +
      'Pick the single best canned reply from the list and lightly personalize it. ' +
      'If none fit, write a short helpful reply.\nCanned replies:\n' + menu + '\nReturn only the reply text.';
    const out = await brain.processPrompt(prompt, { tenantId: tenantId, maxTokens: 300 });
    const text = (out && (out.text || out.content || out.message)) ? (out.text || out.content || out.message) : null;
    if (text && String(text).trim()) {
      return { source: 'ai', reply: String(text).trim(), candidates: candidates };
    }
    return base;
  } catch (e) {
    return base;
  }
}

module.exports = {
  create: create,
  update: update,
  remove: remove,
  get: get,
  list: list,
  render: render,
  byShortcut: byShortcut,
  suggest: suggest,
  markUsed: markUsed,
  analytics: analytics,
  aiSuggest: aiSuggest,
  _internal: { normalizeShortcut: normalizeShortcut, tokenize: tokenize }
};
