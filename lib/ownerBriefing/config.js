// lib/ownerBriefing/config.js — Safe config for the Owner Briefing & Daily Autopilot.
// Read-only aggregation by default. Delivery is DRY-RUN; nothing is sent unless explicitly enabled.

const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'data');

function bool(v, def = false) {
  if (v === undefined || v === null || v === '') return def;
  return String(v).trim().toLowerCase() === 'true';
}
function resolvePath(envVal, fallbackRel) {
  const val = envVal && String(envVal).trim() ? String(envVal).trim() : fallbackRel;
  if (path.isAbsolute(val) || /^[A-Za-z]:[\\/]/.test(val)) return path.join(ROOT, fallbackRel);
  return path.join(ROOT, val);
}

const config = {
  enabled: bool(process.env.OWNER_BRIEFING_ENABLED, true),
  dryRun: bool(process.env.OWNER_BRIEFING_DRY_RUN, true),
  allowLiveSend: bool(process.env.OWNER_BRIEFING_ALLOW_LIVE_SEND, false),
  channel: process.env.OWNER_BRIEFING_CHANNEL || 'whatsapp',
  timezone: process.env.OWNER_BRIEFING_TIMEZONE || 'Asia/Karachi',
  currency: process.env.OWNER_BRIEFING_CURRENCY || 'PKR',
  scheduleMorning: process.env.OWNER_BRIEFING_SCHEDULE_MORNING || '09:00',
  scheduleEvening: process.env.OWNER_BRIEFING_SCHEDULE_EVENING || '20:00',
  paths: {
    root: ROOT,
    dataDir: DATA_DIR,
    store: resolvePath(process.env.OWNER_BRIEFING_STORE_PATH, 'data/owner-briefing.json'),
    history: resolvePath(process.env.OWNER_BRIEFING_HISTORY_PATH, 'data/owner-briefing-history.json'),
  },
};
config.effective = { liveSend: config.enabled && config.allowLiveSend && !config.dryRun };

module.exports = { config, bool, ROOT, DATA_DIR };
