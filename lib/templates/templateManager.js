'use strict';
/**
 * templateManager.js — Templates Feature #1: reusable, merge-field message templates.
 *
 * Instead of retyping the same WhatsApp copy everywhere, save it once as a template with
 * placeholders like {{name}} or {{orderId}}, then render it per contact. Broadcast, drip, support,
 * and dunning can all pull from the same library so messaging stays consistent and on-brand.
 *
 * Rendering reuses the app's existing lib/mergeFields renderer when available (so it matches the
 * rest of the system), with a safe built-in fallback. Storage: JSON (data/templates.json).
 */

const fs = require('fs');
const path = require('path');

let mergeFields = null;
try { mergeFields = require('../mergeFields'); } catch { mergeFields = null; }

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'templates.json');

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { templates: [] }; }
  catch { return { templates: [] }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}
const nowIso = () => new Date().toISOString();

// Extract {{var}} names from a string.
function extractVars(text) {
  const out = new Set();
  const re = /\{\{\s*(\w+)\s*\}\}/g;
  let m;
  while ((m = re.exec(String(text || '')))) out.add(m[1]);
  return [...out];
}

// Built-in fallback renderer (used only if lib/mergeFields isn't available).
function fallbackRender(text, data) {
  return String(text || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (data && data[k] != null ? String(data[k]) : ''));
}
function renderText(text, data) {
  if (mergeFields && typeof mergeFields.renderMergeFields === 'function') {
    try { return mergeFields.renderMergeFields(text, data); } catch { /* fall through */ }
  }
  return fallbackRender(text, data);
}

function createTemplate(opts = {}) {
  if (!opts.name) throw new Error('template needs a name');
  if (!opts.body) throw new Error('template needs a body');
  const data = load();
  const tpl = {
    id: `TPL-${Date.now()}-${Math.random().toString(16).slice(2,6)}`,
    name: opts.name,
    category: opts.category || 'general',   // general | marketing | support | billing | welcome
    language: opts.language || 'en',
    body: opts.body,
    variables: extractVars(opts.body),
    mediaPath: opts.mediaPath || null,
    usageCount: 0,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
  data.templates.push(tpl);
  save(data);
  return tpl;
}

function updateTemplate(id, patch = {}) {
  const data = load();
  const t = data.templates.find(x => x.id === id);
  if (!t) return null;
  if (patch.name !== undefined) t.name = patch.name;
  if (patch.category !== undefined) t.category = patch.category;
  if (patch.language !== undefined) t.language = patch.language;
  if (patch.mediaPath !== undefined) t.mediaPath = patch.mediaPath;
  if (patch.body !== undefined) { t.body = patch.body; t.variables = extractVars(patch.body); }
  t.updatedAt = nowIso();
  save(data);
  return t;
}

function deleteTemplate(id) {
  const data = load();
  const before = data.templates.length;
  data.templates = data.templates.filter(t => t.id !== id);
  save(data);
  return { deleted: before - data.templates.length };
}

function listTemplates(category) {
  const data = load();
  return category ? data.templates.filter(t => t.category === category) : data.templates;
}
function getTemplate(id) { return load().templates.find(t => t.id === id) || null; }

/**
 * Render a template for a given contact/data object. Increments usage. Returns { text, mediaPath,
 * missing } where `missing` lists variables that had no value (so callers can warn).
 */
function render(id, data = {}) {
  const tpl = getTemplate(id);
  if (!tpl) return null;
  const text = renderText(tpl.body, data);
  const missing = tpl.variables.filter(v => data[v] == null || data[v] === '');
  // bump usage
  const store = load();
  const t = store.templates.find(x => x.id === id);
  if (t) { t.usageCount = (t.usageCount || 0) + 1; save(store); }
  return { text, mediaPath: tpl.mediaPath, missing, templateId: id };
}

/** Render ad-hoc text (not a saved template) with the same engine. */
function renderInline(text, data = {}) {
  return { text: renderText(text, data), missing: extractVars(text).filter(v => data[v] == null || data[v] === '') };
}

module.exports = {
  createTemplate, updateTemplate, deleteTemplate,
  listTemplates, getTemplate, render, renderInline, extractVars
};
