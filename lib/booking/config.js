// lib/booking/config.js — Safe config for the Appointment Booking department.
// JSON-backed like the rest of the app. Slot generation + booking are always available; outbound
// confirmation/reminder messages are DRAFT-ONLY until a notifier is wired AND live messages are
// enabled. Respects consent #38 on outbound when present. Never stores secrets.

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
 enabled: bool(process.env.BOOKING_ENABLED, true),
 // Live outbound confirmation/reminder messages. Off by default = draft.
 liveMessages: bool(process.env.BOOKING_LIVE_MESSAGES, false),
 // Default appointment timezone (IANA) used for slot/working-hour math.
 timezone: process.env.BOOKING_TIMEZONE || 'Asia/Karachi',
 // Default slot granularity (minutes) when a service doesn't pin its own.
 slotGranularityMins: num(process.env.BOOKING_SLOT_GRANULARITY_MINS, 30),
 // Minimum lead time before a slot can be booked (minutes).
 minLeadMins: num(process.env.BOOKING_MIN_LEAD_MINS, 60),
 // Respect consent on outbound (won't message an opted-out contact).
 respectConsent: bool(process.env.BOOKING_RESPECT_CONSENT, true),
 // Hours before the appointment to fire a reminder.
 reminderHoursBefore: num(process.env.BOOKING_REMINDER_HOURS_BEFORE, 24),
 paths: {
 root: ROOT,
 dataDir: DATA_DIR,
 store: resolvePath(process.env.BOOKING_STORE_PATH, 'data/booking.json'),
 },
};

config.effective = { liveMessages: config.enabled && config.liveMessages };

const STATUSES = ['booked', 'cancelled', 'completed', 'no_show'];

module.exports = { config, bool, num, ROOT, DATA_DIR, STATUSES };
