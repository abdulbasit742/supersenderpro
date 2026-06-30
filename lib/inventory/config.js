// lib/inventory/config.js — Safe config for the Inventory & Stock department.
// JSON-backed like the rest of the app. Tracks stock + reservations; it never sends. Low/out-of-
// stock events optionally fan into alerts #28. Reservations prevent overselling. Never stores secrets.

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
 enabled: bool(process.env.INVENTORY_ENABLED, true),
 // Default low-stock threshold (per product override available).
 defaultLowStockThreshold: num(process.env.INVENTORY_LOW_STOCK_THRESHOLD, 5),
 // When true, low/out-of-stock crossings emit 'stock.low'/'stock.out' into alerts #28.
 fanAlerts: bool(process.env.INVENTORY_FAN_ALERTS, true),
 // Allow stock to go negative (oversell). Default false = hard stop at 0.
 allowOversell: bool(process.env.INVENTORY_ALLOW_OVERSELL, false),
 maxLedger: num(process.env.INVENTORY_MAX_LEDGER, 20000),
 paths: {
 root: ROOT,
 dataDir: DATA_DIR,
 store: resolvePath(process.env.INVENTORY_STORE_PATH, 'data/inventory.json'),
 },
};

module.exports = { config, bool, num, ROOT, DATA_DIR };
