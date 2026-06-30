// lib/paymentFulfillment/config.js — Safe config for the Payment Fulfillment bridge.
// Mirrors the saasBilling posture: DRY-RUN by default. Shared billing/license state is only
// mutated when PAYMENT_FULFILLMENT_LIVE=true AND dry-run is off. Receipts + reminders stay
// draft-only until PAYMENT_FULFILLMENT_LIVE_NOTIFICATIONS=true and a notifier is wired in.
// Never stores secrets. Always resolves data paths under the repo root.

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
 enabled: bool(process.env.PAYMENT_FULFILLMENT_ENABLED, true),
 // Dry-run by default to match the SaaS billing layer posture.
 dryRun: bool(process.env.PAYMENT_FULFILLMENT_DRY_RUN, true),
 // When true (and dry-run off), a VERIFIED payment actually marks invoices paid + activates/renews licenses.
 liveFulfillment: bool(process.env.PAYMENT_FULFILLMENT_LIVE, false),
 // When true (and dry-run off), receipts + reminders are actually dispatched via the wired notifier.
 liveNotifications: bool(process.env.PAYMENT_FULFILLMENT_LIVE_NOTIFICATIONS, false),
 // Days relative to renewal due date. Positive = before due (pre-renewal). Negative = after due (dunning).
 reminderOffsetsDays: String(process.env.PAYMENT_FULFILLMENT_REMINDER_OFFSETS || '7,3,1,-1,-3')
 .split(',').map((s) => Number(s.trim())).filter((n) => Number.isFinite(n)),
 graceDays: num(process.env.PAYMENT_FULFILLMENT_GRACE_DAYS, 7),
 paths: {
 root: ROOT,
 dataDir: DATA_DIR,
 store: resolvePath(process.env.PAYMENT_FULFILLMENT_STORE_PATH, 'data/payment-fulfillment.json'),
 },
};

config.effective = {
 liveFulfillment: config.enabled && config.liveFulfillment && !config.dryRun,
 liveNotifications: config.enabled && config.liveNotifications && !config.dryRun,
};

module.exports = { config, bool, num, ROOT, DATA_DIR };
