// lib/contacts/config.js — Safe config for the Contacts & Segmentation department.
// JSON-backed like the rest of the app. Consent-aware: opted-out contacts are excluded from
// segment results by default so downstream sends can't reach them. Never stores secrets.

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
 enabled: bool(process.env.CONTACTS_ENABLED, true),
 // Default country for normalizing local numbers (Pakistan).
 defaultCountry: process.env.CONTACTS_DEFAULT_COUNTRY || 'PK',
 // When true, segment results exclude opted-out contacts (recommended; safe default).
 excludeOptedOutFromSegments: bool(process.env.CONTACTS_EXCLUDE_OPTED_OUT, true),
 maxSegmentPreview: num(process.env.CONTACTS_MAX_SEGMENT_PREVIEW, 1000),
 paths: {
 root: ROOT,
 dataDir: DATA_DIR,
 store: resolvePath(process.env.CONTACTS_STORE_PATH, 'data/contacts.json'),
 },
};

module.exports = { config, bool, num, ROOT, DATA_DIR };
