// lib/voiceAI/conversationStore.js — Persists voice conversation records (safe previews only).

const { config } = require('./config');
const { readJSON, writeJSON } = require('./jsonStore');

function _load() { return readJSON(config.paths.conversations, { items: [] }); }
function _save(d) { return writeJSON(config.paths.conversations, d); }

function all() { const d = _load(); return Array.isArray(d.items) ? d.items : []; }
function get(id) { return all().find((c) => c.id === id) || null; }

function upsert(record) {
  const d = _load();
  d.items = Array.isArray(d.items) ? d.items : [];
  const idx = d.items.findIndex((c) => c.id === record.id);
  if (idx >= 0) d.items[idx] = { ...d.items[idx], ...record, updatedAt: new Date().toISOString() };
  else d.items.push(record);
  _save(d);
  return get(record.id);
}

module.exports = { all, get, upsert };
