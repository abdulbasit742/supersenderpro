// lib/orders/config.js — Safe config for the Order Management department.
// JSON-backed like the rest of the app. Orders are computed + tracked here; this module never
// charges (payments #1 owns that) and never sends directly (status messages are draft-only until
// a notifier is wired). Respects consent #38 on outbound when present. Never stores secrets.

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
 enabled: bool(process.env.ORDERS_ENABLED, true),
 defaultCurrency: process.env.ORDERS_DEFAULT_CURRENCY || 'PKR',
 // Live outbound status-update messages to the customer. Off by default = draft.
 liveMessages: bool(process.env.ORDERS_LIVE_MESSAGES, false),
 respectConsent: bool(process.env.ORDERS_RESPECT_CONSENT, true),
 // Default tax rate (percent) applied to the discounted subtotal; 0 = none.
 taxPercent: num(process.env.ORDERS_TAX_PERCENT, 0),
 // Default flat shipping; waived when a free_shipping coupon applies.
 shippingFlat: num(process.env.ORDERS_SHIPPING_FLAT, 0),
 paths: {
 root: ROOT,
 dataDir: DATA_DIR,
 store: resolvePath(process.env.ORDERS_STORE_PATH, 'data/orders.json'),
 },
};

// Status flow + allowed transitions (guarded so an order can't jump illegally).
const STATUSES = ['draft', 'pending', 'paid', 'fulfilled', 'delivered', 'cancelled', 'refunded'];
const TRANSITIONS = {
 draft: ['pending', 'cancelled'],
 pending: ['paid', 'cancelled'],
 paid: ['fulfilled', 'refunded', 'cancelled'],
 fulfilled: ['delivered', 'refunded'],
 delivered: ['refunded'],
 cancelled: [],
 refunded: [],
};

module.exports = { config, bool, num, ROOT, DATA_DIR, STATUSES, TRANSITIONS };
