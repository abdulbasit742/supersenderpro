// lib/dripCampaigns/config.js — Safe config for the Drip Campaigns (automated journeys) department.
// JSON-backed like the rest of the app. Outbound steps are DRAFT-ONLY by default: the engine
// computes what WOULD be sent and records it, but nothing is sent until a notifier is wired AND
// live sends are enabled. Never stores secrets.

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
 enabled: bool(process.env.DRIP_CAMPAIGNS_ENABLED, true),
 // Draft-only by default: steps are computed + recorded but never auto-sent.
 liveSends: bool(process.env.DRIP_CAMPAIGNS_LIVE_SENDS, false),
 // Safety cap: max messages a single contact can receive across all journeys per day.
 maxStepsPerContactPerDay: num(process.env.DRIP_CAMPAIGNS_MAX_STEPS_PER_CONTACT_PER_DAY, 5),
 // Quiet hours (local 24h). Steps due inside the window defer to the window end.
 quietStartHour: num(process.env.DRIP_CAMPAIGNS_QUIET_START_HOUR, 22),
 quietEndHour: num(process.env.DRIP_CAMPAIGNS_QUIET_END_HOUR, 8),
 paths: {
 root: ROOT,
 dataDir: DATA_DIR,
 store: resolvePath(process.env.DRIP_CAMPAIGNS_STORE_PATH, 'data/drip-campaigns.json'),
 },
};

config.effective = { liveSends: config.enabled && config.liveSends };

module.exports = { config, bool, num, ROOT, DATA_DIR };
