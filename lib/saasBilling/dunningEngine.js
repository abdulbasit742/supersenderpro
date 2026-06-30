'use strict';
/**
 * dunningEngine.js — Payments & Billing Feature #4: dunning (failed-payment recovery).
 *
 * When a renewal payment fails, the subscription goes past_due (Feature #2). Dunning is the polite,
 * automated campaign that tries to recover the money before access is cut: a schedule of reminders
 * (and optional automatic re-charge attempts) over several days. Most involuntary churn is just
 * expired cards — a good dunning flow recovers a big chunk of it.
 *
 * Flow per case:
 *   open -> [reminder/retry at each scheduled offset] -> resolved (paid)  | exhausted (give up)
 *
 * Decoupled via injected functions:
 *   setSender(async (customer, { text }) => void)        // how to message the customer
 *   setRetry(async (case) => boolean)                    // optional: attempt re-charge, true=paid
 *   setOnExhausted((case) => void)                       // e.g. subscriptionLifecycle.cancel(immediate)
 *
 * Storage: JSON (data/dunning.json), matching the rest of the app.
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'dunning.json');
const DAY = 86400000;

// Default schedule: offsets (in days from case open) at which to remind/retry, then give up.
let CONFIG = {
  scheduleDays: [0, 1, 3, 5],   // 4 attempts over 5 days
  messages: [
    'Hi {{name}}, we couldn\'t process your payment for {{plan}}. Please update your payment method to keep your service active.',
    'Reminder: your {{plan}} payment is still pending. Tap to pay and avoid interruption.',
    'Your {{plan}} access will pause soon — a quick payment keeps everything running.',
    'Final notice: without payment your {{plan}} will be paused today. We\'d love to keep you.'
  ]
};
function configure(opts = {}) { CONFIG = { ...CONFIG, ...opts }; return CONFIG; }

let sender = null;
let retry = null;
let onExhausted = null;
function setSender(fn) { sender = typeof fn === 'function' ? fn : null; }
function setRetry(fn) { retry = typeof fn === 'function' ? fn : null; }
function setOnExhausted(fn) { onExhausted = typeof fn === 'function' ? fn : null; }

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { cases: [] }; }
  catch { return { cases: [] }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}

const now = () => Date.now();
const iso = (ms) => new Date(ms).toISOString();

function render(tpl, ctx) {
  return String(tpl || '').replace(/{{\s*(\w+)\s*}}/g, (_, k) => (ctx[k] != null ? String(ctx[k]) : ''));
}
function caseKey(customer, planId) {
  const k = String((customer && (customer.phone || customer.email || customer.id)) || customer || '').trim();
  return `DUN-${k}-${planId}`;
}

/**
 * Open (or reuse) a dunning case for a failed renewal. Usually called from
 * subscriptionLifecycle's onPastDue hook.
 */
function openCase(customer, planId, meta = {}) {
  if (!planId) throw new Error('planId is required');
  const data = load();
  const id = caseKey(customer, planId);
  let c = data.cases.find(x => x.id === id && x.status === 'open');
  if (c) return c; // already dunning

  const tNow = now();
  c = {
    id,
    customer,
    planId,
    meta,
    status: 'open',        // open | resolved | exhausted
    attempt: 0,
    maxAttempts: (CONFIG.scheduleDays || []).length,
    openedAt: iso(tNow),
    nextRunAt: tNow + (CONFIG.scheduleDays?.[0] || 0) * DAY,
    history: [],
    updatedAt: iso(tNow)
  };
  data.cases.push(c);
  save(data);
  return c;
}

/** Mark a case resolved (payment recovered). Call from fulfillment when a past_due plan pays. */
function resolveCase(customer, planId) {
  const data = load();
  const c = data.cases.find(x => x.id === caseKey(customer, planId) && x.status === 'open');
  if (!c) return null;
  c.status = 'resolved';
  c.resolvedAt = iso(now());
  c.updatedAt = c.resolvedAt;
  save(data);
  return c;
}

function scheduleNext(c) {
  const offsets = CONFIG.scheduleDays || [];
  if (c.attempt >= offsets.length) { c.nextRunAt = null; return; }
  c.nextRunAt = new Date(c.openedAt).getTime() + offsets[c.attempt] * DAY;
}

/**
 * Process due dunning cases. Call on an interval (e.g. hourly). For each due case:
 *   - optionally retry the charge (if a retry fn is wired); success -> resolve
 *   - else send the scheduled reminder
 *   - advance attempt; when attempts exhausted -> mark exhausted + onExhausted hook
 */
async function tick() {
  const data = load();
  const tNow = now();
  let reminded = 0, recovered = 0, exhausted = 0;

  for (const c of data.cases) {
    if (c.status !== 'open') continue;
    if (c.nextRunAt == null || tNow < c.nextRunAt) continue;

    const ctx = {
      name: c.customer?.name || 'there',
      plan: c.meta?.planName || c.planId
    };

    // 1) optional auto-retry of the charge
    if (retry) {
      try {
        const paid = await retry(c);
        if (paid) {
          c.status = 'resolved';
          c.resolvedAt = iso(tNow);
          c.history.push({ attempt: c.attempt, action: 'retry', result: 'paid', at: iso(tNow) });
          c.updatedAt = iso(tNow);
          recovered++;
          continue;
        }
        c.history.push({ attempt: c.attempt, action: 'retry', result: 'failed', at: iso(tNow) });
      } catch (e) {
        c.history.push({ attempt: c.attempt, action: 'retry', result: 'error', error: e.message, at: iso(tNow) });
      }
    }

    // 2) send the reminder for this attempt
    const msg = render((CONFIG.messages || [])[c.attempt] || (CONFIG.messages || []).slice(-1)[0] || '', ctx);
    try {
      if (sender && msg) {
        await sender(c.customer, { text: msg });
        c.history.push({ attempt: c.attempt, action: 'reminder', result: 'sent', at: iso(tNow) });
        reminded++;
      }
    } catch (e) {
      c.history.push({ attempt: c.attempt, action: 'reminder', result: 'error', error: e.message, at: iso(tNow) });
    }

    // 3) advance / exhaust
    c.attempt += 1;
    if (c.attempt >= c.maxAttempts) {
      c.status = 'exhausted';
      c.exhaustedAt = iso(tNow);
      c.nextRunAt = null;
      exhausted++;
      try { if (onExhausted) await onExhausted(c); } catch { /* never break sweep */ }
    } else {
      scheduleNext(c);
    }
    c.updatedAt = iso(tNow);
  }

  save(data);
  return { reminded, recovered, exhausted, at: iso(tNow) };
}

function listCases(filter = {}) {
  let rows = load().cases;
  if (filter.status) rows = rows.filter(c => c.status === filter.status);
  return rows;
}
function getStats() {
  const rows = load().cases;
  const by = (s) => rows.filter(c => c.status === s).length;
  const open = by('open'), resolved = by('resolved'), exhausted = by('exhausted');
  const closed = resolved + exhausted;
  return { total: rows.length, open, resolved, exhausted, recoveryRatePct: closed ? Math.round((resolved / closed) * 1000) / 10 : 0 };
}

module.exports = {
  configure,
  setSender,
  setRetry,
  setOnExhausted,
  openCase,
  resolveCase,
  tick,
  listCases,
  getStats
};
