// lib/publicSaasFunnel/store.js
// Public SaaS Launch Funnel — file-backed JSON store + env-driven config.
// Safe by default: dry-run ON, consent required, no live sends, no PII export.
// All runtime JSON lives under data/ (gitignored). Never commit lead/demo/trial data.

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..', '..');

function envBool(name, dflt) {
  const v = process.env[name];
  if (v === undefined || v === null || v === '') return dflt;
  return String(v).toLowerCase() === 'true' || v === '1';
}
function envStr(name, dflt) {
  const v = process.env[name];
  return (v === undefined || v === null || v === '') ? dflt : String(v);
}
function resolvePath(p) {
  return path.isAbsolute(p) ? p : path.join(REPO_ROOT, p);
}

const config = {
  enabled: envBool('PUBLIC_FUNNEL_ENABLED', true),
  dryRun: envBool('PUBLIC_FUNNEL_DRY_RUN', true),
  requireConsent: envBool('PUBLIC_FUNNEL_REQUIRE_CONSENT', true),
  allowTenantWrite: envBool('PUBLIC_FUNNEL_ALLOW_TENANT_WRITE', false),
  allowCrmWrite: envBool('PUBLIC_FUNNEL_ALLOW_CRM_WRITE', false),
  allowLiveEmail: envBool('PUBLIC_FUNNEL_ALLOW_LIVE_EMAIL', false),
  allowLiveWhatsapp: envBool('PUBLIC_FUNNEL_ALLOW_LIVE_WHATSAPP', false),
  exportRawLeads: envBool('PUBLIC_FUNNEL_EXPORT_RAW_LEADS', false),
  strict: envBool('PUBLIC_FUNNEL_STRICT', false),
  defaultLanguage: envStr('PUBLIC_FUNNEL_DEFAULT_LANGUAGE', 'roman_urdu'),
  defaultCurrency: envStr('PUBLIC_FUNNEL_DEFAULT_CURRENCY', 'PKR'),
  paths: {
    funnel: resolvePath(envStr('PUBLIC_FUNNEL_STORE_PATH', 'data/public-funnel.json')),
    leads: resolvePath(envStr('PUBLIC_FUNNEL_LEADS_PATH', 'data/public-funnel-leads.json')),
    demoRequests: resolvePath(envStr('PUBLIC_FUNNEL_DEMO_REQUESTS_PATH', 'data/public-funnel-demo-requests.json')),
    trialRequests: resolvePath(envStr('PUBLIC_FUNNEL_TRIAL_REQUESTS_PATH', 'data/public-funnel-trial-requests.json')),
    history: resolvePath(envStr('PUBLIC_FUNNEL_HISTORY_PATH', 'data/public-funnel-history.json')),
  },
};

function ensureDir(file) {
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
function load(file, fallback) {
  try {
    return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback;
  } catch { return fallback; }
}
function save(file, data) {
  ensureDir(file);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  return data;
}

// Append a redacted history event (audit trail). Never store raw PII here.
function appendHistory(event) {
  const list = load(config.paths.history, []);
  const entry = {
    id: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ts: new Date().toISOString(),
    type: String(event.type || 'event'),
    ref: event.ref || null,
    note: event.note || null,
    dryRun: config.dryRun,
  };
  list.push(entry);
  if (list.length > 5000) list.splice(0, list.length - 5000);
  save(config.paths.history, list);
  return entry;
}
function getHistory(limit = 100) {
  const list = load(config.paths.history, []);
  return list.slice(-Math.max(1, Math.min(1000, limit))).reverse();
}

function newId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

module.exports = { config, load, save, ensureDir, appendHistory, getHistory, newId, resolvePath, REPO_ROOT };
