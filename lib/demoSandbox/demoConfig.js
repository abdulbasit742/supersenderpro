// lib/demoSandbox/demoConfig.js — Demo Sandbox configuration layer.
// Demo-only, dry-run, privacy-safe, live-action-blocked by default. No external calls.
const path = require('path');
const { readJSON, writeJSON } = require('./store');
const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'data');

function bool(v, def=false){ if(v===undefined||v===null||v==='') return def; return String(v).trim().toLowerCase()==='true'; }
function resolvePath(envVal, fallbackRel){
  const val = envVal && String(envVal).trim() ? String(envVal).trim() : fallbackRel;
  // Reject hardcoded absolute / Windows-drive paths — always resolve from repo root.
  if (path.isAbsolute(val) || /^[A-Za-z]:[\\/]/.test(val)) return path.join(ROOT, fallbackRel);
  return path.join(ROOT, val);
}

const paths = {
  root: ROOT,
  dataDir: DATA_DIR,
  store: resolvePath(process.env.DEMO_SANDBOX_STORE_PATH, 'data/demo-sandbox.json'),
  history: resolvePath(process.env.DEMO_SANDBOX_HISTORY_PATH, 'data/demo-sandbox-history.json'),
};

// Immutable safety flags — even if env tries to enable live behaviour, demo stays safe.
const ALLOW_REAL_DATA = bool(process.env.DEMO_SANDBOX_ALLOW_REAL_DATA, false);
const ALLOW_EXTERNAL_CALLS = bool(process.env.DEMO_SANDBOX_ALLOW_EXTERNAL_CALLS, false);

function defaults(){
  const now = new Date().toISOString();
  return {
    enabled: bool(process.env.DEMO_SANDBOX_ENABLED, true),
    dryRun: bool(process.env.DEMO_SANDBOX_DRY_RUN, true),
    demoTenantId: 'demo-tenant-001',
    demoBusinessName: 'SuperSender Demo Co.',
    demoIndustry: 'ai_tools_reseller',
    demoLanguage: 'roman_urdu',
    demoCurrency: 'PKR',
    demoCountry: 'PK',
    scenario: process.env.DEMO_SANDBOX_DEFAULT_SCENARIO || 'ai_tools_reseller',
    showDemoBadges: bool(process.env.DEMO_SANDBOX_SHOW_BADGES, true),
    blockLiveActions: bool(process.env.DEMO_SANDBOX_BLOCK_LIVE_ACTIONS, true),
    allowRealData: ALLOW_REAL_DATA,        // forced false unless explicitly overridden
    allowExternalCalls: ALLOW_EXTERNAL_CALLS, // forced false unless explicitly overridden
    strict: bool(process.env.DEMO_SANDBOX_STRICT, false),
    createdAt: now,
    updatedAt: now,
  };
}

function load(){
  const saved = readJSON(paths.store, null);
  const base = defaults();
  if (!saved || !saved.config) return { ...base };
  // Persisted overrides for the editable subset only; safety flags always recomputed.
  return {
    ...base,
    ...saved.config,
    blockLiveActions: saved.config.blockLiveActions !== false, // default-on
    allowRealData: ALLOW_REAL_DATA,
    allowExternalCalls: ALLOW_EXTERNAL_CALLS,
    updatedAt: saved.config.updatedAt || base.updatedAt,
  };
}

const EDITABLE = ['enabled','dryRun','demoBusinessName','demoIndustry','demoLanguage','demoCurrency','demoCountry','scenario','showDemoBadges'];

function update(patch={}){
  const current = load();
  const next = { ...current };
  for (const k of EDITABLE){ if (k in patch) next[k] = patch[k]; }
  // Safety flags can be tightened but never loosened via API.
  if (patch.blockLiveActions === true) next.blockLiveActions = true;
  next.allowRealData = ALLOW_REAL_DATA;
  next.allowExternalCalls = ALLOW_EXTERNAL_CALLS;
  next.updatedAt = new Date().toISOString();
  const saved = readJSON(paths.store, {});
  saved.config = next;
  writeJSON(paths.store, saved);
  return next;
}

module.exports = { defaults, load, update, paths, bool, ROOT, DATA_DIR, EDITABLE };
