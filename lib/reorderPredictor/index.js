'use strict';

/**
 * Reorder / Replenishment Predictor
 * ----------------------------------
 * Predicts when a customer will run out of a consumable product based on their
 * own purchase cadence, then drafts a reorder nudge. The core is fully
 * deterministic and works with NO model running. An optional local Ollama call
 * only rephrases the nudge into warmer Roman-Urdu; if the model host is
 * unreachable we fall back to a deterministic template.
 *
 * House rules honored:
 *  - Self-hosted first (llmHub / aiBrain -> Ollama qwen2.5:32b), cloud fallback.
 *  - Zero new npm deps (Node built-ins + global fetch only).
 *  - File-backed storage under data/reorderPredictor/, tenant-scoped.
 *  - Dry-run by default: we draft nudges, never auto-send.
 *  - server.js untouched; route is self-mountable.
 */

const fs = require('fs');
const path = require('path');

const DATA_ROOT = path.join(process.cwd(), 'data', 'reorderPredictor');
const DAY_MS = 24 * 60 * 60 * 1000;

function assertTenant(tenantId) {
  if (!tenantId || typeof tenantId !== 'string') {
    throw new Error('reorderPredictor: tenantId is required');
  }
  if (/[\\/]|\.\./.test(tenantId)) {
    throw new Error('reorderPredictor: invalid tenantId');
  }
  return tenantId;
}

function tenantDir(tenantId) {
  const dir = path.join(DATA_ROOT, assertTenant(tenantId));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function storeFile(tenantId) {
  return path.join(tenantDir(tenantId), 'orders.json');
}

// ---- tiny mtime-cached JSON store (matches repo store.js convention) -------
const _cache = new Map();
function readStore(tenantId) {
  const file = storeFile(tenantId);
  let stat;
  try {
    stat = fs.statSync(file);
  } catch {
    return { orders: [] };
  }
  const hit = _cache.get(file);
  if (hit && hit.mtimeMs === stat.mtimeMs) return hit.data;
  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    data = { orders: [] };
  }
  if (!Array.isArray(data.orders)) data.orders = [];
  _cache.set(file, { mtimeMs: stat.mtimeMs, data });
  return data;
}

function writeStore(tenantId, data) {
  const file = storeFile(tenantId);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  try {
    const stat = fs.statSync(file);
    _cache.set(file, { mtimeMs: stat.mtimeMs, data });
  } catch { /* ignore */ }
  return data;
}

/**
 * Record a purchase. A purchase is one customer buying `qty` units of a
 * consumable `sku` on `at` (ms epoch). `expectedDaysPerUnit` is optional and
 * lets the merchant hint a consumption rate (e.g. a 30-day shampoo bottle).
 */
function recordPurchase(tenantId, purchase = {}) {
  assertTenant(tenantId);
  const {
    customerId,
    phone = '',
    sku,
    name = sku,
    qty = 1,
    at = Date.now(),
    expectedDaysPerUnit = null,
  } = purchase;
  if (!customerId) throw new Error('reorderPredictor: customerId required');
  if (!sku) throw new Error('reorderPredictor: sku required');
  const data = readStore(tenantId);
  data.orders.push({
    customerId: String(customerId),
    phone: String(phone || ''),
    sku: String(sku),
    name: String(name || sku),
    qty: Math.max(1, Number(qty) || 1),
    at: Number(at) || Date.now(),
    expectedDaysPerUnit:
      expectedDaysPerUnit == null ? null : Math.max(1, Number(expectedDaysPerUnit)),
  });
  writeStore(tenantId, data);
  return { ok: true, count: data.orders.length };
}

function maskPhone(phone) {
  const s = String(phone || '');
  if (s.length <= 4) return s ? '****' : '';
  return s.slice(0, 3) + '****' + s.slice(-2);
}

function median(nums) {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * Deterministic core: for each (customer, sku) estimate the consumption
 * interval and predict the next run-out date.
 *
 * Estimation strategy (in priority order):
 *  1. If we have >= 2 purchases of that sku, use the MEDIAN gap between
 *     consecutive purchase dates, normalized per unit, as the cadence.
 *  2. Else, fall back to merchant-provided expectedDaysPerUnit * qty.
 *  3. Else, skip (not enough signal).
 */
function predict(tenantId, opts = {}) {
  assertTenant(tenantId);
  const now = Number(opts.now) || Date.now();
  const horizonDays = Math.max(1, Number(opts.horizonDays) || 7); // nudge window
  const data = readStore(tenantId);

  // group by customer+sku
  const groups = new Map();
  for (const o of data.orders) {
    const key = o.customerId + '|' + o.sku;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(o);
  }

  const predictions = [];
  for (const [, orders] of groups) {
    orders.sort((a, b) => a.at - b.at);
    const last = orders[orders.length - 1];
    let cadenceDays = null;
    let basis = null;

    if (orders.length >= 2) {
      const gaps = [];
      for (let i = 1; i < orders.length; i++) {
        const gapDays = (orders[i].at - orders[i - 1].at) / DAY_MS;
        const units = orders[i - 1].qty || 1;
        if (gapDays > 0) gaps.push(gapDays / units);
      }
      const m = median(gaps);
      if (m && m > 0) {
        cadenceDays = m * (last.qty || 1);
        basis = 'history';
      }
    }
    if (cadenceDays == null && last.expectedDaysPerUnit) {
      cadenceDays = last.expectedDaysPerUnit * (last.qty || 1);
      basis = 'merchant-hint';
    }
    if (cadenceDays == null) continue; // not enough signal

    const runOutAt = last.at + cadenceDays * DAY_MS;
    const daysToRunOut = Math.round((runOutAt - now) / DAY_MS);

    predictions.push({
      customerId: last.customerId,
      phoneMasked: maskPhone(last.phone),
      sku: last.sku,
      name: last.name,
      lastPurchaseAt: last.at,
      cadenceDays: Math.round(cadenceDays),
      runOutAt,
      daysToRunOut,
      basis,
      due: daysToRunOut <= horizonDays,
    });
  }

  predictions.sort((a, b) => a.daysToRunOut - b.daysToRunOut);
  return { now, horizonDays, predictions };
}

function templateNudge(p) {
  const when =
    p.daysToRunOut <= 0
      ? 'ab tak khatam ho gaya hoga'
      : `~${p.daysToRunOut} din me khatam hone wala hai`;
  return (
    `Assalam o alaikum! Aap ka *${p.name}* ${when}. ` +
    `Dobara order karna hai? Reply "YES" karein, hum abhi book kar dete hain.`
  );
}

async function phraseNudge(p, deps = {}) {
  const fallback = templateNudge(p);
  const ai = deps.aiBrain || tryLoadAiBrain();
  if (!ai || typeof ai.processPrompt !== 'function') return fallback;
  const prompt =
    'Tum aik dosti-bhara WhatsApp shopkeeper ho (Pakistan). Roman-Urdu me 1 short ' +
    'reorder reminder likho, max 2 lines, emoji thora. Product: ' +
    `"${p.name}", customer ke paas ~${Math.max(0, p.daysToRunOut)} din ka stock bacha hai. ` +
    'Sirf message likho, kuch aur nahi.';
  try {
    const out = await ai.processPrompt(prompt, { maxTokens: 120, temperature: 0.6 });
    const text = (typeof out === 'string' ? out : out && out.text) || '';
    const clean = text.trim();
    return clean.length >= 8 ? clean : fallback;
  } catch {
    return fallback;
  }
}

function tryLoadAiBrain() {
  try {
    // optional local resolver chain; absence is fine (deterministic fallback)
    return require('../../ai/aiBrain');
  } catch {
    try {
      return require('../llmHub');
    } catch {
      return null;
    }
  }
}

/**
 * Build dry-run reorder nudges for everyone due within the horizon.
 * Returns drafts only; nothing is sent.
 */
async function buildNudges(tenantId, opts = {}) {
  const { predictions, now, horizonDays } = predict(tenantId, opts);
  const due = predictions.filter((p) => p.due);
  const drafts = [];
  for (const p of due) {
    drafts.push({
      customerId: p.customerId,
      phoneMasked: p.phoneMasked,
      sku: p.sku,
      name: p.name,
      daysToRunOut: p.daysToRunOut,
      basis: p.basis,
      message: await phraseNudge(p, opts),
      dryRun: true,
    });
  }
  return { now, horizonDays, count: drafts.length, drafts };
}

module.exports = {
  recordPurchase,
  predict,
  buildNudges,
  // exported for tests
  _internal: { median, maskPhone, templateNudge, DATA_ROOT },
};
