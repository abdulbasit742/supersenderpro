// developerPortal/store.js — safe JSON persistence for the Developer Portal.
// All data files live under data/ (gitignored). Never stores raw secrets — only hashes/previews.
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function p(envKey, def) { return path.join(__dirname, '../../', process.env[envKey] || def); }

const PATHS = {
  apps:       () => p('DEVELOPER_PORTAL_STORE_PATH', 'data/developer-portal.json'),
  webhooks:   () => p('DEVELOPER_PORTAL_WEBHOOKS_PATH', 'data/developer-webhooks.json'),
  deliveries: () => p('DEVELOPER_PORTAL_DELIVERIES_PATH', 'data/developer-webhook-deliveries.json'),
  history:    () => p('DEVELOPER_PORTAL_HISTORY_PATH', 'data/developer-portal-history.json'),
};

function read(file, fallback) {
  try {
    if (!fs.existsSync(file)) { fs.writeFileSync(file, JSON.stringify(fallback, null, 2)); return fallback; }
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch { return fallback; }
}
function write(file, data) {
  try { fs.writeFileSync(file, JSON.stringify(data, null, 2)); return true; } catch { return false; }
}

function appendHistory(entry) {
  const f = PATHS.history();
  const h = read(f, { events: [] });
  h.events.unshift({ ...entry, ts: new Date().toISOString() });
  if (h.events.length > 1000) h.events = h.events.slice(0, 1000);
  write(f, h);
}

module.exports = { PATHS, read, write, appendHistory };
