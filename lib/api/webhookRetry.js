'use strict';
/**
 * webhookRetry.js — API Feature #4: reliable webhook delivery with retries.
 *
 * Tenant webhooks (#api2) are fire-and-forget: if the receiver is briefly down, the event is lost.
 * Real platforms retry. This queues failed deliveries and retries them with exponential backoff
 * (1m, 5m, 30m, 2h, 6h), then dead-letters after max attempts so nothing silently vanishes.
 *
 * The actual HTTP delivery is injected (reuse the SSRF-safe dispatcher). tick() processes due items.
 * Storage: JSON (data/webhook_retry.json).
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'webhook_retry.json');
const BACKOFF_MS = [60000, 300000, 1800000, 7200000, 21600000]; // 1m,5m,30m,2h,6h

let deliver = null; // async (item) => { ok:boolean }   (does the HTTP POST; ok=false triggers retry)
function setDeliver(fn) { deliver = typeof fn === 'function' ? fn : null; }

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { queue: [], dead: [] }; }
  catch { return { queue: [], dead: [] }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}
const nowMs = () => Date.now();
const iso = (ms) => new Date(ms).toISOString();

/** Enqueue a delivery for retry (call when the first attempt fails). */
function enqueue(item = {}) {
  const data = load();
  const entry = {
    id: `WR-${Date.now()}-${Math.random().toString(16).slice(2,6)}`,
    tenantId: item.tenantId || null,
    url: item.url,
    event: item.event || null,
    payload: item.payload || {},
    attempts: Number(item.attempts || 1),   // already tried once
    nextAt: nowMs() + (BACKOFF_MS[0] || 60000),
    createdAt: iso(nowMs())
  };
  data.queue.push(entry);
  save(data);
  return entry;
}

/** Process all due retries. Call on an interval (e.g. every minute). */
async function tick() {
  if (!deliver) return { processed: 0, reason: 'no deliver fn' };
  const data = load();
  const t = nowMs();
  let processed = 0, recovered = 0, dead = 0;
  const keep = [];

  for (const item of data.queue) {
    if (t < item.nextAt) { keep.push(item); continue; }
    processed++;
    let ok = false;
    try { const r = await deliver(item); ok = !!(r && r.ok); } catch { ok = false; }

    if (ok) { recovered++; continue; } // drop from queue on success

    item.attempts += 1;
    if (item.attempts > BACKOFF_MS.length) {
      item.deadAt = iso(t);
      data.dead.push(item);
      dead++;
    } else {
      item.nextAt = t + BACKOFF_MS[Math.min(item.attempts - 1, BACKOFF_MS.length - 1)];
      keep.push(item);
    }
  }

  data.queue = keep;
  if (data.dead.length > 1000) data.dead = data.dead.slice(-1000);
  save(data);
  return { processed, recovered, dead, pending: keep.length, at: iso(t) };
}

function stats() {
  const data = load();
  return { pending: data.queue.length, dead: data.dead.length };
}
function listDead(limit = 100) {
  return load().dead.slice(-Math.max(1, Number(limit) || 100)).reverse();
}
/** Requeue a dead-lettered item to try again. */
function replayDead(id) {
  const data = load();
  const idx = data.dead.findIndex(d => d.id === id);
  if (idx === -1) return null;
  const item = data.dead.splice(idx, 1)[0];
  item.attempts = 1; item.nextAt = nowMs(); delete item.deadAt;
  data.queue.push(item);
  save(data);
  return item;
}

module.exports = { setDeliver, enqueue, tick, stats, listDead, replayDead };
