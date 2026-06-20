// lib/voiceAI/historyStore.js — Records completed/attempted voice actions for reporting.
// Stores only safe previews, never raw audio or full transcripts.

const { config } = require('./config');
const { readJSON, writeJSON } = require('./jsonStore');
const { redactText } = require('./redaction');

const MAX = 5000;

function add(item) {
  const safe = {
    id: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    type: item.type || 'unknown',
    provider: item.provider || null,
    channel: item.channel || null,
    status: item.status || 'logged',
    dryRun: item.dryRun !== undefined ? item.dryRun : config.dryRun,
    preview: item.preview ? redactText(item.preview).slice(0, 200) : null,
    intent: item.intent || null,
    sentiment: item.sentiment || null,
  };
  const data = readJSON(config.paths.history, { items: [] });
  data.items = Array.isArray(data.items) ? data.items : [];
  data.items.push(safe);
  if (data.items.length > MAX) data.items = data.items.slice(-MAX);
  writeJSON(config.paths.history, data);
  return safe;
}

function list({ limit = 200, type = null } = {}) {
  const data = readJSON(config.paths.history, { items: [] });
  let items = Array.isArray(data.items) ? data.items : [];
  if (type) items = items.filter((i) => i.type === type);
  return items.slice(-limit).reverse();
}

module.exports = { add, list };
