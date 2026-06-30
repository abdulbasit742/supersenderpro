// lib/aiAutoReply/config.js — Safe config for the AI Auto-Reply (smart responder) department.
// SUGGEST-MODE by default: the engine drafts a reply but never sends it until
// AI_AUTO_REPLY_LIVE=true AND a notifier is wired. Routes through the existing lib/llmHub when
// present; otherwise a deterministic local fallback is used. Never stores secrets.

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
 enabled: bool(process.env.AI_AUTO_REPLY_ENABLED, true),
 // Master kill switch (separate from enabled) so an operator can pause replies instantly.
 killSwitch: bool(process.env.AI_AUTO_REPLY_KILL_SWITCH, false),
 // Suggest-only by default: draft, don't send.
 liveSend: bool(process.env.AI_AUTO_REPLY_LIVE, false),
 // Replies below this confidence are handed off to a human instead of answered.
 minConfidence: num(process.env.AI_AUTO_REPLY_MIN_CONFIDENCE, 0.55),
 // Per-contact cooldown (minutes) to avoid rapid-fire auto-replies.
 cooldownMinutes: num(process.env.AI_AUTO_REPLY_COOLDOWN_MINUTES, 2),
 // Business hours (local 24h). Outside -> auto-reply only with the after-hours notice.
 businessStartHour: num(process.env.AI_AUTO_REPLY_BUSINESS_START_HOUR, 9),
 businessEndHour: num(process.env.AI_AUTO_REPLY_BUSINESS_END_HOUR, 21),
 afterHoursMessage: process.env.AI_AUTO_REPLY_AFTER_HOURS_MESSAGE || 'Thanks for your message! Our team is offline right now and will reply during business hours.',
 maxReplyChars: num(process.env.AI_AUTO_REPLY_MAX_REPLY_CHARS, 600),
 paths: {
 root: ROOT,
 dataDir: DATA_DIR,
 store: resolvePath(process.env.AI_AUTO_REPLY_STORE_PATH, 'data/ai-auto-reply.json'),
 },
};

config.effective = { liveSend: config.enabled && config.liveSend && !config.killSwitch };

module.exports = { config, bool, num, ROOT, DATA_DIR };
