// lib/experiments/config.js — Safe config for the A/B Testing (experiments) department.
// JSON-backed like the rest of the app. This module assigns variants + tracks outcomes; it does
// NOT send anything. Winner auto-declaration is advisory (a flag), never auto-acts. No secrets.

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
 enabled: bool(process.env.EXPERIMENTS_ENABLED, true),
 // Minimum sample (sends) per variant before a winner can be recommended.
 minSamplePerVariant: num(process.env.EXPERIMENTS_MIN_SAMPLE_PER_VARIANT, 100),
 // z-score threshold for significance (1.96 ≈ 95% confidence, two-tailed).
 significanceZ: num(process.env.EXPERIMENTS_SIGNIFICANCE_Z, 1.96),
 paths: {
 root: ROOT,
 dataDir: DATA_DIR,
 store: resolvePath(process.env.EXPERIMENTS_STORE_PATH, 'data/experiments.json'),
 },
};

module.exports = { config, bool, num, ROOT, DATA_DIR };
