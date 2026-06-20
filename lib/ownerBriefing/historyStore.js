// lib/ownerBriefing/historyStore.js — Stores safe previews of generated briefings.

const { config } = require('./config');
const { readJSON, writeJSON } = require('./store');
const { redact } = require('./privacy');

const MAX = 1000;

function add(briefing) {
  const d = readJSON(config.paths.history, { items: [] });
  d.items = Array.isArray(d.items) ? d.items : [];
  d.items.push({
    id: `brf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    kind: briefing.kind,
    at: briefing.generatedAt,
    dryRun: briefing.dryRun,
    preview: redact(briefing.text || '').slice(0, 400),
    alertCount: (briefing.alerts || []).length,
    actionCount: (briefing.actions || []).length,
  });
  if (d.items.length > MAX) d.items = d.items.slice(-MAX);
  writeJSON(config.paths.history, d);
  return d.items[d.items.length - 1];
}
function list({ limit = 50 } = {}) {
  const d = readJSON(config.paths.history, { items: [] });
  return (Array.isArray(d.items) ? d.items : []).slice(-limit).reverse();
}
module.exports = { add, list };
