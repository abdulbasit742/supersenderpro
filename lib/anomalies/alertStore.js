// lib/anomalies/alertStore.js
// JSON-backed alert ledger with dedupe. Same defensive pattern as the other
// stores: never throws, file is the source of truth. Dedupe keeps us from
// re-alerting the same metric+date+direction every time the batch runs.

const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.ALERTS_DATA_DIR || path.join(__dirname, '..', '..', 'data', 'alerts');
const FILE = path.join(DATA_DIR, 'alerts.json');

function read() {
  try {
    if (!fs.existsSync(FILE)) return { alerts: [] };
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    return { alerts: [] };
  }
}
function write(data) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
  } catch { /* best-effort */ }
}

function dedupeKey(storeId, a) { return `${storeId}:${a.metric}:${a.date}:${a.direction}`; }

// Add alerts that haven't been seen before. Returns only the newly-added ones.
function addNew(storeId, alerts) {
  const data = read();
  data.alerts = data.alerts || [];
  const seen = new Set(data.alerts.map((x) => x.key));
  const fresh = [];
  for (const a of alerts) {
    const key = dedupeKey(storeId, a);
    if (seen.has(key)) continue;
    const rec = { ...a, storeId, key, createdAt: new Date().toISOString(), acknowledged: false };
    data.alerts.unshift(rec);
    seen.add(key);
    fresh.push(rec);
  }
  if (data.alerts.length > 2000) data.alerts = data.alerts.slice(0, 2000);
  write(data);
  return fresh;
}

function list(storeId, { limit = 100, includeAcknowledged = true } = {}) {
  const data = read();
  let alerts = (data.alerts || []).filter((a) => !storeId || a.storeId === storeId);
  if (!includeAcknowledged) alerts = alerts.filter((a) => !a.acknowledged);
  return alerts.slice(0, limit);
}

function acknowledge(key) {
  const data = read();
  const a = (data.alerts || []).find((x) => x.key === key);
  if (a) { a.acknowledged = true; a.acknowledgedAt = new Date().toISOString(); write(data); }
  return a || null;
}

module.exports = { addNew, list, acknowledge, DATA_DIR };
