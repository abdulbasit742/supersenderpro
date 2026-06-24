'use strict';

/**
 * templateStore.js
 * JSON-backed store for reusable message templates (with spintax + variables).
 * Stored under data/templates.json, consistent with the rest of the project.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const spintax = require('./spintax');

const DATA_DIR = process.env.CAMPAIGN_DATA_DIR || path.join(__dirname, '..', 'data');
const STORE_FILE = path.join(DATA_DIR, 'templates.json');

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(STORE_FILE)) fs.writeFileSync(STORE_FILE, JSON.stringify({ templates: [] }, null, 2));
}
function readAll() {
  ensureStore();
  try {
    const d = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8') || '{}');
    if (!Array.isArray(d.templates)) d.templates = [];
    return d;
  } catch { return { templates: [] }; }
}
function writeAll(d) {
  ensureStore();
  const tmp = STORE_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(d, null, 2));
  fs.renameSync(tmp, STORE_FILE);
}
function newId() { return 'tpl_' + crypto.randomBytes(6).toString('hex'); }

function createTemplate(input = {}) {
  const d = readAll();
  const now = new Date().toISOString();
  const body = String(input.body || '');
  const t = {
    id: newId(),
    name: String(input.name || 'Untitled template').slice(0, 200),
    category: String(input.category || 'general'),
    body,
    variables: spintax.extractVariables(body),
    variants: spintax.countVariants(body),
    createdAt: now,
    updatedAt: now,
  };
  d.templates.push(t);
  writeAll(d);
  return t;
}
function listTemplates() { return readAll().templates; }
function getTemplate(id) { return readAll().templates.find((t) => t.id === id) || null; }
function updateTemplate(id, patch = {}) {
  const d = readAll();
  const i = d.templates.findIndex((t) => t.id === id);
  if (i === -1) return null;
  const merged = { ...d.templates[i], ...patch, updatedAt: new Date().toISOString() };
  if (patch.body != null) {
    merged.variables = spintax.extractVariables(patch.body);
    merged.variants = spintax.countVariants(patch.body);
  }
  d.templates[i] = merged;
  writeAll(d);
  return merged;
}
function deleteTemplate(id) {
  const d = readAll();
  const n = d.templates.length;
  d.templates = d.templates.filter((t) => t.id !== id);
  writeAll(d);
  return d.templates.length < n;
}
/** Render a template body with the given variables (spintax expanded). */
function renderTemplate(id, vars = {}) {
  const t = getTemplate(id);
  if (!t) return null;
  return spintax.render(t.body, vars);
}

module.exports = {
  STORE_FILE, createTemplate, listTemplates, getTemplate,
  updateTemplate, deleteTemplate, renderTemplate,
};
