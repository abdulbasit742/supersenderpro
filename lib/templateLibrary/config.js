// lib/templateLibrary/config.js — Safe config for the Message Templates Library department.
// JSON-backed like the rest of the app. Pure content store + renderer; sends nothing. No secrets.

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
 enabled: bool(process.env.TEMPLATE_LIBRARY_ENABLED, true),
 // How many historical versions to retain per template.
 maxVersionsPerTemplate: num(process.env.TEMPLATE_LIBRARY_MAX_VERSIONS, 20),
 paths: {
 root: ROOT,
 dataDir: DATA_DIR,
 store: resolvePath(process.env.TEMPLATE_LIBRARY_STORE_PATH, 'data/template-library.json'),
 },
};

const CATEGORIES = ['welcome', 'promo', 'transactional', 'reminder', 'support', 'followup', 'general'];

module.exports = { config, bool, num, ROOT, DATA_DIR, CATEGORIES };
