// lib/abTesting/config.js — Safe config for the A/B Testing department. JSON-backed like the
// rest of the app. This module decides WHICH message variant a contact should get and records
// outcomes; it never sends anything itself. Never stores secrets.

const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'data');

function bool(v, def = false) {
 if (v === undefined || v === null || v === '') return def;
 return String(v).trim().toLowerCase() === 'true';
}
function num(v, def) { const n = Number(v); return Number.isFinite(n) ? n : def; }
function resolvePath(envVal, fallbackRel) {
 const val = envVal && String(envVal).trim() ? String(envVal).trim() : fallbackRel;
 if (path.isAbsolute(val) || /^[A-Za-z]:[\\/]/.test(val)) return path.join(ROOT, fallbackRel);
 return path.join(ROOT, val);
}

const config = {
 enabled: bool(process.env.AB_TESTING_ENABLED, true),
 // Minimum assignments per variant before a winner may be declared.
 minSamplePerVariant: num(process.env.AB_TESTING_MIN_SAMPLE, 30),
 // Minimum absolute conversion-rate gap (percentage points) to call a winner.
 minRateGapPct: num(process.env.AB_TESTING_MIN_RATE_GAP_PCT, 5),
 paths: {
 root: ROOT,
 dataDir: DATA_DIR,
 store: resolvePath(process.env.AB_TESTING_STORE_PATH, 'data/ab-testing.json'),
 },
};

module.exports = { config, bool, num, ROOT, DATA_DIR };
