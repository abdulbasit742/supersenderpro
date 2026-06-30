// lib/audienceSegments/config.js — Safe config for the Audience Segments department.
// Read-only over contacts. Segment DEFINITIONS are JSON-backed; contact data is never copied
// or mutated, only evaluated. Previews mask PII. Never stores secrets.

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
 enabled: bool(process.env.AUDIENCE_SEGMENTS_ENABLED, true),
 // Max recipients a single segment resolution returns (safety cap for downstream sends).
 maxResolveSize: num(process.env.AUDIENCE_SEGMENTS_MAX_RESOLVE_SIZE, 100000),
 // Max contacts to scan from the source per evaluation (protects against huge stores).
 maxScan: num(process.env.AUDIENCE_SEGMENTS_MAX_SCAN, 500000),
 paths: {
 root: ROOT,
 dataDir: DATA_DIR,
 store: resolvePath(process.env.AUDIENCE_SEGMENTS_STORE_PATH, 'data/audience-segments.json'),
 },
};

module.exports = { config, bool, num, ROOT, DATA_DIR };
