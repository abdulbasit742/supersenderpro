'use strict';
/**
 * #94 Back-in-Stock Waitlist & Notifier
 * Customers ask for an out-of-stock item -> added to a waitlist ->
 * auto-notified (consent-gated, throttled) the moment it restocks.
 *
 * Design:
 *  - Deterministic core: works with NO model. add/list/notify all pure logic.
 *  - LLM only phrases the friendly "it's back!" message; template fallback always.
 *  - Consent (#80) + Broadcast Throttle (#90) gates loaded best-effort; if those
 *    modules are absent we fail OPEN for consent? NO -> fail SAFE (skip notify)
 *    only when an explicit opt-out is known; otherwise allow with template.
 *  - File-backed under data/waitlist/<tenantId>.json. Tenant-aware (throws if missing).
 *  - Zero new npm deps. Node built-ins + global fetch only.
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data', 'waitlist');
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const MODEL = process.env.SUPPORT_AGENT_MODEL || 'qwen2.5:32b';

// ---- best-effort optional integrations (never hard-fail) -------------------
function tryRequire(p) { try { return require(p); } catch (_) { return null; } }
const consentMod = tryRequire('../consent/consentEngine') || tryRequire('../consent');
const throttleMod = tryRequire('../broadcastThrottle/throttleEngine') || tryRequire('../broadcastThrottle');

function assertTenant(tenantId) {
  if (!tenantId || typeof tenantId !== 'string') {
    throw new Error('waitlist: tenantId is required');
  }
  return tenantId;
}

function fileFor(tenantId) {
  return path.join(DATA_DIR, `${assertTenant(tenantId)}.json`);
}

function load(tenantId) {
  const f = fileFor(tenantId);
  try {
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch (_) {
    return { entries: [] };
  }
}

function save(tenantId, db) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(fileFor(tenantId), JSON.stringify(db, null, 2));
}

function now() { return Date.now(); }
function key(productId, contact) { return `${String(productId).trim()}::${String(contact).trim()}`; }

// ---- public API ------------------------------------------------------------

/**
 * Add a customer to the waitlist for an out-of-stock product.
 * Dedupes on (productId, contact). Returns the entry.
 */
function join(tenantId, { productId, productName, contact, name, locale } = {}) {
  assertTenant(tenantId);
  if (!productId) throw new Error('waitlist: productId required');
  if (!contact) throw new Error('waitlist: contact required');

  const db = load(tenantId);
  const k = key(productId, contact);
  let entry = db.entries.find((e) => e.key === k && e.status === 'waiting');
  if (entry) {
    entry.requests = (entry.requests || 1) + 1;
    entry.updatedAt = now();
    save(tenantId, db);
    return { entry, deduped: true };
  }
  entry = {
    key: k,
    productId: String(productId).trim(),
    productName: productName || null,
    contact: String(contact).trim(),
    name: name || null,
    locale: locale || process.env.AGENT_LANGUAGE || 'en',
    status: 'waiting',
    requests: 1,
    createdAt: now(),
    updatedAt: now(),
    notifiedAt: null
  };
  db.entries.push(entry);
  save(tenantId, db);
  return { entry, deduped: false };
}

/** List waitlist entries, optional filter by productId/status. */
function list(tenantId, { productId, status } = {}) {
  assertTenant(tenantId);
  const db = load(tenantId);
  return db.entries.filter((e) =>
    (productId ? e.productId === String(productId).trim() : true) &&
    (status ? e.status === status : true));
}

/** How many people are waiting per product. */
function stats(tenantId) {
  assertTenant(tenantId);
  const db = load(tenantId);
  const byProduct = {};
  for (const e of db.entries) {
    if (e.status !== 'waiting') continue;
    byProduct[e.productId] = byProduct[e.productId] || { productId: e.productId, productName: e.productName, waiting: 0 };
    byProduct[e.productId].waiting += 1;
  }
  return { total: db.entries.length, waiting: Object.values(byProduct) };
}

/** Remove a single entry (manual unsubscribe). */
function remove(tenantId, { productId, contact } = {}) {
  assertTenant(tenantId);
  const db = load(tenantId);
  const k = key(productId, contact);
  const before = db.entries.length;
  db.entries = db.entries.filter((e) => e.key !== k);
  save(tenantId, db);
  return { removed: before - db.entries.length };
}

// consent gate: allow unless we KNOW the contact opted out
function allowedByConsent(tenantId, contact) {
  try {
    if (consentMod && typeof consentMod.isAllowed === 'function') {
      return consentMod.isAllowed(tenantId, contact, 'marketing') !== false;
    }
    if (consentMod && typeof consentMod.check === 'function') {
      const r = consentMod.check(tenantId, contact);
      return r !== false && r !== 'opted_out';
    }
  } catch (_) {}
  return true; // no consent module -> allow with template
}

// throttle gate: ask throttle module if we may send now
function allowedByThrottle(tenantId, contact) {
  try {
    if (throttleMod && typeof throttleMod.canSend === 'function') {
      return throttleMod.canSend(tenantId, contact) !== false;
    }
  } catch (_) {}
  return true;
}

async function phraseMessage(entry) {
  const pname = entry.productName || `your item (${entry.productId})`;
  const fallback = `Good news${entry.name ? ' ' + entry.name : ''}! "${pname}" is back in stock. Reply to order before it sells out again.`;
  const dryRun = String(process.env.LLM_HUB_DRY_RUN || '').toLowerCase() === 'true';
  if (dryRun) return fallback;
  try {
    const res = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        stream: false,
        keep_alive: process.env.OLLAMA_KEEP_ALIVE || '-1',
        prompt: `Write ONE short, warm WhatsApp message (max 2 sentences, ${entry.locale}) telling a customer their waitlisted product is back in stock and to reply to order. Product: "${pname}". No emojis spam, no markdown. Message only.`
      })
    });
    if (!res.ok) return fallback;
    const data = await res.json();
    const txt = (data && data.response || '').trim();
    return txt || fallback;
  } catch (_) {
    return fallback; // offline / model down -> deterministic template
  }
}

/**
 * Restock event: notify everyone waiting on productId.
 * Returns per-contact outcome. Respects consent + throttle gates.
 * `sink` is an optional async fn(contact, message, entry) that actually delivers;
 * when absent we only compute + mark (dry path, safe by default).
 */
async function notifyRestock(tenantId, { productId, productName, sink } = {}) {
  assertTenant(tenantId);
  if (!productId) throw new Error('waitlist: productId required');
  const db = load(tenantId);
  const targets = db.entries.filter((e) => e.productId === String(productId).trim() && e.status === 'waiting');
  const results = [];
  for (const entry of targets) {
    if (productName && !entry.productName) entry.productName = productName;
    if (!allowedByConsent(tenantId, entry.contact)) {
      entry.status = 'skipped_consent';
      entry.updatedAt = now();
      results.push({ contact: entry.contact, sent: false, reason: 'consent' });
      continue;
    }
    if (!allowedByThrottle(tenantId, entry.contact)) {
      // leave as waiting so a later run can retry
      results.push({ contact: entry.contact, sent: false, reason: 'throttled' });
      continue;
    }
    const message = await phraseMessage(entry);
    let delivered = false;
    if (typeof sink === 'function') {
      try { await sink(entry.contact, message, entry); delivered = true; } catch (_) { delivered = false; }
    }
    entry.status = delivered ? 'notified' : 'ready';
    entry.notifiedAt = delivered ? now() : null;
    entry.lastMessage = message;
    entry.updatedAt = now();
    results.push({ contact: entry.contact, sent: delivered, message, reason: delivered ? 'sent' : 'computed' });
  }
  save(tenantId, db);
  return { productId: String(productId).trim(), targeted: targets.length, results };
}

module.exports = { join, list, stats, remove, notifyRestock, _phraseMessage: phraseMessage };
