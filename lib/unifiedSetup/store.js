// lib/unifiedSetup/store.js — Safe JSON store for the Unified Setup Wizard.
// Repo-relative paths only. Never throws on read. Atomic-ish write via temp file.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function bool(v, def = false) {
  if (v === undefined || v === null || v === '') return def;
  return String(v).trim().toLowerCase() === 'true';
}

function resolvePath(envVal, fallbackRel) {
  const val = envVal && String(envVal).trim() ? String(envVal).trim() : fallbackRel;
  if (path.isAbsolute(val) || /^[A-Za-z]:[\\/]/.test(val)) return path.join(ROOT, fallbackRel);
  return path.join(ROOT, val);
}

const config = {
  enabled: bool(process.env.UNIFIED_SETUP_ENABLED, true),
  dryRun: bool(process.env.UNIFIED_SETUP_DRY_RUN, true),
  requireAuth: bool(process.env.UNIFIED_SETUP_REQUIRE_AUTH, false),
  autopilotEnabled: bool(process.env.UNIFIED_SETUP_AUTOPILOT_ENABLED, true),
  paths: {
    root: ROOT,
    store: resolvePath(process.env.UNIFIED_SETUP_STORE_PATH, 'data/unified-setup.json'),
    history: resolvePath(process.env.UNIFIED_SETUP_HISTORY_PATH, 'data/unified-setup-history.json'),
    tasks: resolvePath(process.env.UNIFIED_SETUP_TASKS_PATH, 'data/unified-setup-tasks.json'),
    exportDir: resolvePath(process.env.UNIFIED_SETUP_EXPORT_DIR, 'artifacts'),
  },
};

function readJSON(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    const raw = fs.readFileSync(file, 'utf8');
    if (!raw.trim()) return fallback;
    return JSON.parse(raw);
  } catch (_e) { return fallback; }
}

function writeJSON(file, data) {
  try {
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, file);
    return true;
  } catch (_e) { return false; }
}

// Repo-relative file existence check (safe).
function repoHas(relativePath) {
  try { return fs.existsSync(path.join(ROOT, relativePath)); } catch (_e) { return false; }
}

function appendHistory(event, meta = {}) {
  const h = readJSON(config.paths.history, { events: [] });
  h.events = Array.isArray(h.events) ? h.events : [];
  h.events.push({ event, at: new Date().toISOString(), meta });
  if (h.events.length > 2000) h.events = h.events.slice(-2000);
  writeJSON(config.paths.history, h);
}

module.exports = { config, readJSON, writeJSON, repoHas, appendHistory, ROOT, bool };
