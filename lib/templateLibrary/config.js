// lib/templateLibrary/config.js — Safe config for the Message Template Library department.
// JSON-backed like the rest of the app. Templates carry an approval state; render() can be
// restricted to approved-only in production via requireApprovedToRender. Never stores secrets.

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
 // When true, render() refuses to render a template that isn't approved (recommended for prod sends).
 requireApprovedToRender: bool(process.env.TEMPLATE_LIBRARY_REQUIRE_APPROVED, false),
 // Max rendered length guard (WhatsApp practical limit-ish); render flags overflow.
 maxRenderChars: num(process.env.TEMPLATE_LIBRARY_MAX_RENDER_CHARS, 4096),
 maxVersionsKept: num(process.env.TEMPLATE_LIBRARY_MAX_VERSIONS, 20),
 paths: {
 root: ROOT,
 dataDir: DATA_DIR,
 store: resolvePath(process.env.TEMPLATE_LIBRARY_STORE_PATH, 'data/template-library.json'),
 },
};

const STATUSES = ['draft', 'pending_review', 'approved', 'archived'];

module.exports = { config, bool, num, ROOT, DATA_DIR, STATUSES };
