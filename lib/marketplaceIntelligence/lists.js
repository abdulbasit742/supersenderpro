'use strict';
/**
 * lists.js — persisted user lists for Marketplace Intelligence:
 *  - price-alert watchlist  (alert when a SKU drops/spikes past a threshold)
 *  - saved searches
 *  - seller whitelist / blacklist  (advisory only — never auto-bans)
 *  - outbound webhooks  (dry-run: logged, NOT sent, unless explicitly enabled)
 *
 * Stored in data/marketplace-intelligence-lists.json (gitignored).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const priceRadar = require('./priceRadar');
const store = require('./store');

const ROOT = path.join(__dirname, '..', '..');
const FILE = path.join(ROOT, process.env.MARKETPLACE_INTELLIGENCE_LISTS_PATH || 'data/marketplace-intelligence-lists.json');

const DEFAULT = () => ({ watchlist: [], savedSearches: [], whitelist: [], blacklist: [], webhooks: [], alerts: [] });
function read() { try { return { ...DEFAULT(), ...JSON.parse(fs.readFileSync(FILE, 'utf8')) }; } catch (_) { return DEFAULT(); } }
function write(d) { try { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(d, null, 2)); } catch (e) { console.error('[MI lists]', e.message); } return d; }
function uid(p) { return `${p}_${crypto.randomBytes(4).toString('hex')}`; }

// ── Watchlist ────────────────────────────────────────────────
function addWatch({ sku, dropPct = 8, spikePct = 8 }) {
  const d = read();
  if (!sku) throw new Error('sku required');
  const item = { id: uid('w'), sku, dropPct: Number(dropPct), spikePct: Number(spikePct), createdAt: new Date().toISOString() };
  d.watchlist.push(item); write(d); return item;
}
function removeWatch(id) { const d = read(); d.watchlist = d.watchlist.filter(w => w.id !== id); write(d); return { ok: true }; }
function listWatch() { return read().watchlist; }

/** Evaluate watchlist against current price radar; returns triggered alerts (dry-run). */
function checkAlerts() {
  const d = read();
  const prices = Object.fromEntries(priceRadar.summarize(store.read()).map(p => [p.sku, p]));
  const changes = priceRadar.detectChanges(store.read(), 1);
  const triggered = [];
  for (const w of d.watchlist) {
    const c = changes.find(x => x.sku === w.sku);
    if (!c) continue;
    if (c.direction === 'drop' && Math.abs(c.changePct) >= w.dropPct) triggered.push({ watchId: w.id, sku: w.sku, kind: 'drop', changePct: c.changePct, price: c.toPrice });
    if (c.direction === 'spike' && c.changePct >= w.spikePct) triggered.push({ watchId: w.id, sku: w.sku, kind: 'spike', changePct: c.changePct, price: c.toPrice });
  }
  if (triggered.length) { d.alerts.push(...triggered.map(t => ({ ...t, ts: new Date().toISOString() }))); if (d.alerts.length > 500) d.alerts.splice(0, d.alerts.length - 500); write(d); }
  return { dryRun: true, triggered };
}
function listAlerts() { return read().alerts.slice(-100); }

// ── Saved searches ───────────────────────────────────────────
function saveSearch({ name, query, filters }) { const d = read(); const item = { id: uid('s'), name: name || query || 'search', query: query || '', filters: filters || {}, createdAt: new Date().toISOString() }; d.savedSearches.push(item); write(d); return item; }
function listSearches() { return read().savedSearches; }
function removeSearch(id) { const d = read(); d.savedSearches = d.savedSearches.filter(s => s.id !== id); write(d); return { ok: true }; }

// ── Whitelist / blacklist (advisory) ─────────────────────────
function tagSeller(list, sellerId, note = '') {
  if (!['whitelist', 'blacklist'].includes(list)) throw new Error('list must be whitelist|blacklist');
  const d = read();
  if (!d[list].find(x => x.sellerId === sellerId)) d[list].push({ sellerId, note, ts: new Date().toISOString() });
  // a seller can't be in both
  const other = list === 'whitelist' ? 'blacklist' : 'whitelist';
  d[other] = d[other].filter(x => x.sellerId !== sellerId);
  write(d); return { ok: true, list };
}
function untagSeller(list, sellerId) { const d = read(); d[list] = (d[list] || []).filter(x => x.sellerId !== sellerId); write(d); return { ok: true }; }
function lists() { const d = read(); return { whitelist: d.whitelist, blacklist: d.blacklist }; }

// ── Webhooks (dry-run by default) ────────────────────────────
function addWebhook({ url, events }) { const d = read(); const item = { id: uid('h'), url, events: events || ['*'], createdAt: new Date().toISOString() }; d.webhooks.push(item); write(d); return item; }
function listWebhooks() { return read().webhooks; }
function removeWebhook(id) { const d = read(); d.webhooks = d.webhooks.filter(h => h.id !== id); write(d); return { ok: true }; }

/** Dispatch an event to webhooks. DRY-RUN: returns what WOULD be sent unless live=true. */
async function dispatch(event, payload, opts = {}) {
  const d = read();
  const live = opts.live === true && String(process.env.MARKETPLACE_INTELLIGENCE_WEBHOOK_LIVE || 'false').toLowerCase() === 'true';
  const targets = d.webhooks.filter(h => h.events.includes('*') || h.events.includes(event));
  const results = [];
  for (const h of targets) {
    if (!live) { results.push({ url: h.url, event, dryRun: true }); continue; }
    try {
      const r = await fetch(h.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event, payload }) });
      results.push({ url: h.url, event, status: r.status });
    } catch (e) { results.push({ url: h.url, event, error: e.message }); }
  }
  return { dispatched: results.length, live, results };
}

module.exports = {
  addWatch, removeWatch, listWatch, checkAlerts, listAlerts,
  saveSearch, listSearches, removeSearch,
  tagSeller, untagSeller, lists,
  addWebhook, listWebhooks, removeWebhook, dispatch
};
