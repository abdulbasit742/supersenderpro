// lib/coupons/config.js — Safe config for the Coupons & Discount Codes department.
// JSON-backed like the rest of the app. This module validates + applies discounts and records
// redemptions; it never charges or sends. Redemption recording is the only mutation. No secrets.

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
 enabled: bool(process.env.COUPONS_ENABLED, true),
 defaultCurrency: process.env.COUPONS_DEFAULT_CURRENCY || 'PKR',
 // Length of auto-generated coupon codes.
 codeLength: num(process.env.COUPONS_CODE_LENGTH, 8),
 maxBulkGenerate: num(process.env.COUPONS_MAX_BULK, 1000),
 paths: {
 root: ROOT,
 dataDir: DATA_DIR,
 store: resolvePath(process.env.COUPONS_STORE_PATH, 'data/coupons.json'),
 },
};

const TYPES = ['percent', 'fixed', 'free_shipping'];

module.exports = { config, bool, num, ROOT, DATA_DIR, TYPES };
