// lib/shortLinks/config.js — Safe config for the Short Links & Click Tracking department.
// JSON-backed like the rest of the app. Destinations are validated (http/https only, optional
// host allowlist) to avoid open-redirect abuse. Click records store a MASKED contact only.
// Never stores secrets.

const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'data');

function bool(v, def = false) {
 if (v === undefined || v === null || v === '') return def;
 return String(v).trim().toLowerCase() === 'true';
}
function num(v, def) { const n = Number(v); return Number.isFinite(n) ? n : def; }
function list(v) { return String(v || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean); }
function resolvePath(envVal, fallbackRel) {
 const val = envVal && String(envVal).trim() ? String(envVal).trim() : fallbackRel;
 if (path.isAbsolute(val) || /^[A-Za-z]:[\\/]/.test(val)) return path.join(ROOT, fallbackRel);
 return path.join(ROOT, val);
}

const config = {
 enabled: bool(process.env.SHORT_LINKS_ENABLED, true),
 // Public base used to build the short URL, e.g. https://sndr.pk -> https://sndr.pk/l/<code>
 baseUrl: process.env.SHORT_LINKS_BASE_URL || process.env.PUBLIC_BASE_URL || 'http://localhost:3001',
 // Path prefix the redirect route is mounted at.
 routePrefix: process.env.SHORT_LINKS_ROUTE_PREFIX || '/l',
 codeLength: num(process.env.SHORT_LINKS_CODE_LENGTH, 7),
 // Optional comma-separated allowlist of destination hosts. Empty = allow any http(s) host.
 allowedHosts: list(process.env.SHORT_LINKS_ALLOWED_HOSTS),
 maxClicksStored: num(process.env.SHORT_LINKS_MAX_CLICKS, 200000),
 paths: {
 root: ROOT,
 dataDir: DATA_DIR,
 store: resolvePath(process.env.SHORT_LINKS_STORE_PATH, 'data/short-links.json'),
 },
};

module.exports = { config, bool, num, ROOT, DATA_DIR };
