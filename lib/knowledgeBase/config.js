// lib/knowledgeBase/config.js — Safe config for the Knowledge Base department.
// JSON-backed like the rest of the app. Read-mostly: authors articles + serves ranked search.
// render/search can be limited to published-only for public/AI use. Never stores secrets.

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
 enabled: bool(process.env.KB_ENABLED, true),
 // Default number of search results.
 searchLimit: num(process.env.KB_SEARCH_LIMIT, 5),
 // Minimum score (0..1-ish) for a result to be returned (filters weak matches).
 minScore: num(process.env.KB_MIN_SCORE, 0.05),
 paths: {
 root: ROOT,
 dataDir: DATA_DIR,
 store: resolvePath(process.env.KB_STORE_PATH, 'data/knowledge-base.json'),
 },
};

const STATUSES = ['draft', 'published', 'archived'];

module.exports = { config, bool, num, ROOT, DATA_DIR, STATUSES };
