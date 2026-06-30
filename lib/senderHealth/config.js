// lib/senderHealth/config.js — Safe config for the Sender Health & Anti-Ban department.
// JSON-backed like the rest of the app. This module NEVER sends anything itself — it is an
// advisory governor: gate() returns allow/hold/deny + a recommended delay, and the caller (the
// real WhatsApp sender) decides. Enforcement is advisory by default. Never stores secrets.

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
 enabled: bool(process.env.SENDER_HEALTH_ENABLED, true),
 // Warmup ramp: a freshly-registered number starts at warmupStartCap/day and grows by
 // warmupGrowthPerDay each day until it reaches dailyCapMax.
 warmupStartCap: num(process.env.SENDER_HEALTH_WARMUP_START_CAP, 20),
 warmupGrowthPerDay: num(process.env.SENDER_HEALTH_WARMUP_GROWTH_PER_DAY, 20),
 dailyCapMax: num(process.env.SENDER_HEALTH_DAILY_CAP_MAX, 1000),
 hourlyCap: num(process.env.SENDER_HEALTH_HOURLY_CAP, 120),
 // Randomized delay (ms) between sends to look human; gate() returns a value in this range.
 minDelayMs: num(process.env.SENDER_HEALTH_MIN_DELAY_MS, 3000),
 maxDelayMs: num(process.env.SENDER_HEALTH_MAX_DELAY_MS, 12000),
 // Health scoring: each block/complaint subtracts; clean sends slowly recover.
 blockPenalty: num(process.env.SENDER_HEALTH_BLOCK_PENALTY, 8),
 complaintPenalty: num(process.env.SENDER_HEALTH_COMPLAINT_PENALTY, 15),
 // Below this score, gate() denies (the number needs a rest / review).
 denyBelowScore: num(process.env.SENDER_HEALTH_DENY_BELOW_SCORE, 40),
 paths: {
 root: ROOT,
 dataDir: DATA_DIR,
 store: resolvePath(process.env.SENDER_HEALTH_STORE_PATH, 'data/sender-health.json'),
 },
};

module.exports = { config, bool, num, ROOT, DATA_DIR };
