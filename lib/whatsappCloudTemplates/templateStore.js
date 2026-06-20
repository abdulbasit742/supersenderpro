// lib/whatsappCloudTemplates/templateStore.js — CRUD persistence for WhatsApp Cloud templates (gitignored data file).
'use strict';

const fs = require('fs');
const path = require('path');
const { buildTemplate } = require('./templateModel');
const { seedTemplates } = require('./templateCatalog');

const FILE = process.env.WHATSAPP_CLOUD_TEMPLATES_STORE_PATH
  || path.join(__dirname, '..', '..', 'data', 'whatsapp-templates.json');

let cache = null;

function ensureDir() {
  const dir = path.dirname(FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function load() {
  if (cache) return cache;
  try {
    const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    cache = Array.isArray(raw.templates) ? raw.templates : [];
  } catch (_) {
    cache = seedTemplates(); // seed with sample templates on first use
  }
  return cache;
}

function persist() {
  ensureDir();
  fs.writeFileSync(FILE, JSON.stringify({ templates: cache, updatedAt: new Date().toISOString() }, null, 2));
}

function all() { return load().slice(); }
function ids() { return load().map((t) => t.id); }
function get(id) { return load().find((t) => t.id === id) || null; }

function upsert(input = {}) {
  load();
  const tpl = buildTemplate(input);
  const idx = cache.findIndex((t) => t.id === tpl.id);
  if (idx >= 0) {
    tpl.createdAt = cache[idx].createdAt; // preserve original creation time
    cache[idx] = tpl;
  } else {
    cache.push(tpl);
  }
  persist();
  return tpl;
}

function update(id, patch = {}) {
  const existing = get(id);
  if (!existing) return null;
  return upsert(Object.assign({}, existing, patch, { id }));
}

function remove(id) {
  load();
  const before = cache.length;
  cache = cache.filter((t) => t.id !== id);
  persist();
  return cache.length < before;
}

function _resetForTests() { cache = null; }

module.exports = { FILE, all, ids, get, upsert, update, remove, _resetForTests };
