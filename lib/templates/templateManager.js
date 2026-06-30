'use strict';
/**
 * templateManager.js — Templates Feature #1: reusable, personalised message templates.
 *
 * Instead of retyping copy everywhere, save templates once with {{merge}} fields and reuse them in
 * broadcasts, drips, support replies, and dunning. render() fills the fields from a contact /
 * Customer 360 profile. If the app's existing lib/mergeFields renderer is available, we use it so
 * behaviour matches the rest of the app; otherwise a built-in {{var}} replacer is used.
 *
 * Storage: JSON (data/message_templates.json).
 */

const fs = require('fs');
const path = require('path');

let mergeFields = null;
try { mergeFields = require('../mergeFields'); } catch { mergeFields = null; }

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'message_templates.json');

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { templates: [] }; }
  catch { return { templates: [] }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}
const nowIso = () => new Date().toISOString();

// Extract {{var}} names from a body.
function extractVars(body) {
  const out = new Set();
  const re = /\{\{\s*([\w.]+)\s*\}\}/g;
  let m;
  while ((m = re.exec(String(body || '')))) out.add(m[1]);
  return [...out];
}

// Built-in renderer fallback: replace {{var}} from a flat data object; unknown -> '' (kept safe).
function builtinRender(body, data) {
  return String(body || '').replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k) => {
    const v = k.split('.').reduce((o, part) => (o == null ? undefined : o[part]), data);
    return v == null ? '' : String(v);
  });
}

function createTemplate(opts = {}) {
  if (!opts.name) throw new Error('template needs a name');
  if (!opts.body) throw new Error('template needs a body');
  const data = load();
  const tpl = {
    id: `TPL-${Date.now()}-${Math.random().toString(16).slice(2,6)}`,
    name: opts.name,
    category: opts.category || 'general',  // promo | followup | support | reminder | general
    body: opts.body,
    variables: extractVars(opts.body),
    mediaPath: opts.mediaPath || null,
    usage: 0,
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

// Build the data object a template renders against, from a contact / 360 profile.
function contactData(contact = {}) {
  const c = contact || {};
  const stats = c.stats || {};
  return {
    name: c.name || c.pushname || '',
    phone: c.phone || '',
    email: c.email || '',
    stage: c.stage || '',
    tags: (c.tags || []).join(', '),
    totalSpent: stats.totalSpent != null ? stats.totalSpent : (c.totalSpent || ''),
    orderCount: stats.orderCount != null ? stats.orderCount : (c.orderCount || ''),
    loyaltyTier: c.loyaltyTier || '',
    loyaltyPoints: c.loyaltyPoints != null ? c.loyaltyPoints : ''
  };
}

/**
 * Render a template for a contact. Returns the final text (+ mediaPath if any).
 * Uses lib/mergeFields.renderMergeFields when available for app-consistent behaviour.
 */
function render(id, contact = {}, extra = {}) {
  const tpl = getTemplate(id);
  if (!tpl) throw new Error('template not found');
  const data = { ...contactData(contact), ...extra };
  let text;
  if (mergeFields && typeof mergeFields.renderMergeFields === 'function') {
    try { text = mergeFields.renderMergeFields(tpl.body, data); }
    catch { text = builtinRender(tpl.body, data); }
  } else {
    text = builtinRender(tpl.body, data);
  }
  // bump usage
  const store = load();
  const t = store.templates.find(x => x.id === id);
  if (t) { t.usage = (t.usage || 0) + 1; save(store); }
  return { text, mediaPath: tpl.mediaPath || null };
}

/** Preview with sample data without bumping usage. */
function preview(id, sample = {}) {
  const tpl = getTemplate(id);
  if (!tpl) throw new Error('template not found');
  return { text: builtinRender(tpl.body, { name: 'Ali', phone: '03001234567', ...sample }), variables: tpl.variables };
}

module.exports = { createTemplate, updateTemplate, deleteTemplate, listTemplates, getTemplate, render, preview, extractVars };
