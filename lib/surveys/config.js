// lib/surveys/config.js — Safe config for the Surveys & NPS/CSAT Feedback department.
// JSON-backed like the rest of the app. Sending the survey prompt is DRAFT-ONLY until a notifier
// is wired AND live send is enabled; response capture + scoring always work. Never stores secrets.

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
 enabled: bool(process.env.SURVEYS_ENABLED, true),
 liveSend: bool(process.env.SURVEYS_LIVE_SEND, false),
 // How long an outstanding survey ask stays open for a contact's reply to count (hours).
 responseWindowHours: num(process.env.SURVEYS_RESPONSE_WINDOW_HOURS, 72),
 // Respect consent: when true, don't send a survey to a contact the consent center blocks.
 respectConsent: bool(process.env.SURVEYS_RESPECT_CONSENT, true),
 paths: {
 root: ROOT,
 dataDir: DATA_DIR,
 store: resolvePath(process.env.SURVEYS_STORE_PATH, 'data/surveys.json'),
 },
};

config.effective = { liveSend: config.enabled && config.liveSend };

const TYPES = ['nps', 'csat', 'poll', 'text'];

module.exports = { config, bool, num, ROOT, DATA_DIR, TYPES };
