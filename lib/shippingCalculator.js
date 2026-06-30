'use strict';
/**
 * AI Shipping & COD Fee Calculator + ETA Estimator (#97)
 * ---------------------------------------------------------------------------
 * GPU-edge feature for SuperSender Pro.
 *
 * Design rules (shared across the whole AI suite):
 *  - DETERMINISTIC CORE: every money number (shipping fee, COD surcharge,
 *    free-shipping threshold, ETA window) is pure code. The model NEVER
 *    decides a price. It only PHRASES the final, already-computed quote.
 *  - LLM is optional: if Ollama/aiBrain is unreachable we fall back to a
 *    deterministic template string. The numbers are identical either way.
 *  - ZERO new npm deps: Node built-ins only (fs, path).
 *  - File-backed config per store under data/shipping/<storeId>.json so each
 *    tenant can tune zones/rates without code changes.
 *  - server.js is never touched; mount via routes/shippingRoutes.js.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data', 'shipping');

// ---------------------------------------------------------------------------
// Default rate card. A store can override any of this via its config file.
// All amounts are in the store's minor-unit-free currency (e.g. PKR rupees).
// ---------------------------------------------------------------------------
const DEFAULT_CONFIG = {
  currency: 'PKR',
  // base + per-kg, resolved per zone. Weight is rounded UP to the next 0.5kg.
  zones: {
    local:    { label: 'Local / same city', base: 150, perKg: 40, etaDays: [1, 2] },
    regional: { label: 'Regional / nearby cities', base: 220, perKg: 60, etaDays: [2, 4] },
    national: { label: 'Nationwide', base: 300, perKg: 90, etaDays: [3, 7] },
    remote:   { label: 'Remote / far-flung areas', base: 450, perKg: 120, etaDays: [5, 10] }
  },
  // City -> zone map (lowercased). Unknown cities default to `national`.
  cityZones: {
    karachi: 'local', lahore: 'regional', islamabad: 'regional',
    rawalpindi: 'regional', faisalabad: 'regional', multan: 'national',
    peshawar: 'national', quetta: 'remote', gilgit: 'remote', skardu: 'remote'
  },
  defaultZone: 'national',
  // Cash-on-delivery surcharge: flat + percentage of order value.
  cod: { enabled: true, flat: 50, pct: 0.01, maxOrderValue: 100000 },
  // Orders at/above this subtotal ship free (COD surcharge still applies).
  freeShippingThreshold: 5000,
  // Optional weekend cutoff: orders confirmed Sat/Sun add this many days.
  weekendBufferDays: 1
};

function ensureDir() {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_) {}
}

function configPath(storeId) {
  const safe = String(storeId || 'default').replace(/[^a-z0-9_-]/gi, '_');
  return path.join(DATA_DIR, `${safe}.json`);
}

function deepMerge(base, over) {
  if (!over || typeof over !== 'object') return base;
  const out = Array.isArray(base) ? base.slice() : Object.assign({}, base);
  for (const k of Object.keys(over)) {
    const bv = base ? base[k] : undefined;
    const ov = over[k];
    if (bv && ov && typeof bv === 'object' && typeof ov === 'object' && !Array.isArray(ov)) {
      out[k] = deepMerge(bv, ov);
    } else {
      out[k] = ov;
    }
  }
  return out;
}

function loadConfig(storeId) {
  ensureDir();
  try {
    const raw = fs.readFileSync(configPath(storeId), 'utf8');
    return deepMerge(DEFAULT_CONFIG, JSON.parse(raw));
  } catch (_) {
    return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  }
}

function saveConfig(storeId, patch) {
  ensureDir();
  const merged = deepMerge(loadConfig(storeId), patch || {});
  fs.writeFileSync(configPath(storeId), JSON.stringify(merged, null, 2));
  return merged;
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------
function roundUpHalfKg(weightKg) {
  const w = Math.max(0.5, Number(weightKg) || 0.5);
  return Math.ceil(w * 2) / 2;
}

function resolveZone(cfg, { zone, city } = {}) {
  if (zone && cfg.zones[zone]) return zone;
  if (city) {
    const z = cfg.cityZones[String(city).trim().toLowerCase()];
    if (z && cfg.zones[z]) return z;
  }
  return cfg.defaultZone;
}

function money(n) { return Math.round(Number(n) || 0); }

/**
 * Core deterministic quote. No model involved.
 * @param {object} order { city?, zone?, weightKg?, subtotal?, payment? ('cod'|'prepaid') }
 * @param {string} storeId
 */
function quote(order = {}, storeId = 'default') {
  const cfg = loadConfig(storeId);
  const zoneKey = resolveZone(cfg, order);
  const zone = cfg.zones[zoneKey];
  const weightKg = roundUpHalfKg(order.weightKg);
  const subtotal = money(order.subtotal);
  const payment = (order.payment || 'prepaid').toLowerCase();

  // Shipping fee (deterministic).
  let shipping = money(zone.base + zone.perKg * weightKg);
  let freeShipping = false;
  if (cfg.freeShippingThreshold && subtotal >= cfg.freeShippingThreshold) {
    shipping = 0;
    freeShipping = true;
  }

  // COD surcharge (deterministic). Only on cash-on-delivery.
  let codSurcharge = 0;
  let codBlocked = false;
  if (payment === 'cod') {
    if (!cfg.cod.enabled) {
      codBlocked = true;
    } else if (subtotal > cfg.cod.maxOrderValue) {
      codBlocked = true; // too high-value for COD
    } else {
      codSurcharge = money(cfg.cod.flat + cfg.cod.pct * subtotal);
    }
  }

  // ETA window (deterministic). Optional weekend buffer.
  const now = new Date();
  const isWeekend = now.getDay() === 0 || now.getDay() === 6;
  const buffer = isWeekend ? (cfg.weekendBufferDays || 0) : 0;
  const etaMin = zone.etaDays[0] + buffer;
  const etaMax = zone.etaDays[1] + buffer;

  const total = money(subtotal + shipping + codSurcharge);

  return {
    storeId,
    currency: cfg.currency,
    zone: zoneKey,
    zoneLabel: zone.label,
    weightKg,
    subtotal,
    payment,
    shipping,
    freeShipping,
    codSurcharge,
    codBlocked,
    eta: { minDays: etaMin, maxDays: etaMax },
    total,
    // human-friendly breakdown lines for any UI
    lines: [
      { label: 'Subtotal', amount: subtotal },
      { label: freeShipping ? 'Shipping (FREE)' : `Shipping (${zone.label})`, amount: shipping },
      ...(codSurcharge ? [{ label: 'COD surcharge', amount: codSurcharge }] : []),
      { label: 'Total', amount: total }
    ]
  };
}

// ---------------------------------------------------------------------------
// Deterministic template reply (used when LLM is unavailable).
// ---------------------------------------------------------------------------
function templateReply(q) {
  const c = q.currency;
  if (q.codBlocked) {
    return `Order ${c} ${q.subtotal} for ${q.zoneLabel}. Cash on Delivery is not available for this order, please use prepaid. Shipping ${q.freeShipping ? 'is FREE' : c + ' ' + q.shipping}. Delivery in ${q.eta.minDays}-${q.eta.maxDays} working days.`;
  }
  const shipTxt = q.freeShipping ? 'FREE shipping' : `Shipping ${c} ${q.shipping}`;
  const codTxt = q.codSurcharge ? ` (incl. ${c} ${q.codSurcharge} COD fee)` : '';
  return `Delivery to ${q.zoneLabel}: ${shipTxt}${codTxt}. Estimated arrival ${q.eta.minDays}-${q.eta.maxDays} working days. Total payable: ${c} ${q.total}.`;
}

// ---------------------------------------------------------------------------
// LLM phrasing (optional). Numbers are passed in and must NOT change.
// ---------------------------------------------------------------------------
async function phrase(q, opts = {}) {
  const fallback = templateReply(q);
  let brain;
  try { brain = require('../ai/aiBrain'); } catch (_) { return fallback; }
  if (!brain || typeof brain.processPrompt !== 'function') return fallback;

  const lang = opts.lang || 'the customer\u2019s language';
  const prompt = [
    'You are a friendly WhatsApp shop assistant. Write ONE short, warm message',
    `in ${lang} confirming shipping cost and delivery time. Use ONLY these exact`,
    'numbers, do not invent or change any figure:',
    JSON.stringify({
      currency: q.currency, zone: q.zoneLabel, shipping: q.shipping,
      freeShipping: q.freeShipping, codSurcharge: q.codSurcharge,
      codBlocked: q.codBlocked, etaMinDays: q.eta.minDays,
      etaMaxDays: q.eta.maxDays, total: q.total
    }),
    'Keep it under 40 words. No markdown, no emojis unless natural.'
  ].join(' ');

  try {
    const out = await brain.processPrompt(prompt, { maxTokens: 120, temperature: 0.4, ...opts });
    const text = (out && (out.text || out.output || out.content)) || (typeof out === 'string' ? out : '');
    const clean = String(text).trim();
    // Safety net: if the model dropped the total figure, fall back.
    if (!clean || !clean.includes(String(q.total))) return fallback;
    return clean;
  } catch (_) {
    return fallback;
  }
}

/** Full convenience flow: compute quote + produce a ready-to-send reply. */
async function quoteAndReply(order = {}, storeId = 'default', opts = {}) {
  const q = quote(order, storeId);
  const message = await phrase(q, opts);
  return { quote: q, message };
}

module.exports = {
  DEFAULT_CONFIG,
  loadConfig,
  saveConfig,
  resolveZone,
  roundUpHalfKg,
  quote,
  templateReply,
  phrase,
  quoteAndReply
};
