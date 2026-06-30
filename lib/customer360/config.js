// lib/customer360/config.js — Safe config for the Customer 360 & Activity Timeline department.
// JSON-backed like the rest of the app. Read/aggregate only: this module records per-contact
// activity events and rolls them into a profile + score. It never sends. PII is masked in views.
// Never stores secrets.

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
 enabled: bool(process.env.CUSTOMER360_ENABLED, true),
 // Max timeline events kept per contact (oldest trimmed).
 maxEventsPerContact: num(process.env.CUSTOMER360_MAX_EVENTS_PER_CONTACT, 500),
 // Engagement scoring half-life in days (recent activity weighted higher).
 recencyHalfLifeDays: num(process.env.CUSTOMER360_RECENCY_HALFLIFE_DAYS, 14),
 paths: {
 root: ROOT,
 dataDir: DATA_DIR,
 store: resolvePath(process.env.CUSTOMER360_STORE_PATH, 'data/customer-360.json'),
 },
};

// Per-event-type weight contributing to the engagement score (positive = engaged, negative = risk).
const EVENT_WEIGHTS = {
 message_in: 4, message_out: 1, click: 5, payment: 12, ticket_opened: 2,
 ticket_resolved: 1, survey_response: 6, nps_promoter: 8, nps_detractor: -6,
 opt_in: 6, opt_out: -20, signup: 5, abandoned_cart: -2, login: 3, custom: 1,
};

module.exports = { config, bool, num, ROOT, DATA_DIR, EVENT_WEIGHTS };
