'use strict';
/**
 * dunningEngine.js — Payments & Billing Feature #4: dunning (failed-payment recovery).
 *
 * When a subscription renewal fails it enters `past_due` (lifecycle #2). Dunning is the polite,
 * escalating nudge sequence that tries to recover that payment before access is cut: "your payment
 * failed, please update", a reminder a couple days later, a final notice before expiry.
 *
 * Model:
 *   - A dunning *case* is opened per (customer, planId) when payment fails.
 *   - A configurable schedule defines steps by day offset from case open, each with a message.
 *   - tick() finds due steps and sends them via an injected sender (reuse the WA client).
 *   - If payment succeeds, call resolve() -> case closed 'recovered'. If the last step passes with no
 *     payment, the case is 'exhausted' (lifecycle will expire the sub).
 *
 * Decoupled: sending and "is it paid now" checks are injected. Storage: JSON (data/dunning.json).
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'dunning.json');

// Default schedule: day offsets from case open + message template. {{name}} {{plan}} supported.
let SCHEDULE = [
  { dayOffset: 0, template: 'Hi {{name}}, we couldn\'t process your payment for {{plan}}. Please update your payment to keep your service active. 🙏' },
  { dayOffset: 2, template: 'Reminder: your {{plan}} payment is still pending. Update now to avoid interruption.' },
  { dayOffset: 4, template: 'Final notice: without payment your {{plan}} access will pause soon. Need help? Just reply.' }
];

let sender = null;            // async (contact, { text }) => void
function setSender(fn) { sender = typeof fn === 'function' ? fn : null; }
function configureSchedule(steps) { if (Array.isArray(steps) && steps.length) SCHEDULE = steps.slice().sort((a,b)=>a.dayOffset-b.dayOffset); return SCHEDULE; }

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
const DAY = 86400000;

function keyOf(customer) {
  return String((customer && (customer.phone || customer.email || customer.id)) || customer || '').trim();
}
function render(tpl, ctx) {
  return String(tpl || '').replace(/\{\{(\w+)\}\}/g, (_, k) => (ctx[k] != null ? String(ctx[k]) : ''));
}

/** Open a dunning case (called when a renewal fails / sub goes past_due). Idempotent per open case. */
function openCase(customer, planId, meta = {}) {
  const key = keyOf(customer);
  if (!key) throw new Error('customer needs phone/email/id');
  const data = load();
  const existing = data.cases.find(c => c.key === key && c.planId === planId && c.status === 'open');
  if (existing) return existing;

  const openedAt = now();
  const c = {
    id: `DUN-${Date.now()}-${Math.random().toString(16).slice(2,6)}`,
    key, customer, planId,
    name: meta.name || (customer && customer.name) || '',
    status: 'open',            // open | recovered | exhausted | cancelled
    stepIndex: 0,
    openedAt: iso(openedAt),
    nextRunAt: openedAt + (SCHEDULE[0]?.dayOffset || 0) * DAY,
    history: [],
    updatedAt: iso(openedAt)
  };
  data.cases.push(c);
  save(data);
  return c;
}

/** Payment recovered -> close the case successfully. */
function resolveCase(customer, planId) {
  const data = load();
  const c = data.cases.find(x => x.key === keyOf(customer) && x.planId === planId && x.status === 'open');
  if (!c) return null;
  c.status = 'recovered';
  c.updatedAt = iso(now());
  c.history.push({ event: 'recovered', at: iso(now()) });
  save(data);
  return c;
}

function cancelCase(customer, planId) {
  const data = load();
  const c = data.cases.find(x => x.key === keyOf(customer) && x.planId === planId && x.status === 'open');
  if (!c) return null;
  c.status = 'cancelled';
  c.updatedAt = iso(now());
  save(data);
  return c;
}

/**
 * Process due dunning steps. Call on an interval (e.g. hourly). Sends the current step's reminder if
 * due, advances, and marks 'exhausted' once the last step has been sent and the grace has passed.
 */
async function tick() {
  const data = load();
  const tNow = now();
  let sent = 0, exhausted = 0;

  for (const c of data.cases) {
    if (c.status !== 'open') continue;
    if (tNow < c.nextRunAt) continue;

    const step = SCHEDULE[c.stepIndex];
    if (!step) {
      // no more steps left -> give up; lifecycle (#2) will expire the sub when grace ends
      c.status = 'exhausted';
      c.updatedAt = iso(tNow);
      c.history.push({ event: 'exhausted', at: iso(tNow) });
      exhausted++;
      continue;
    }

    try {
      if (!sender) throw new Error('no sender wired (call setSender)');
      const text = render(step.template, { name: c.name, plan: c.planId });
      await sender(c.customer, { text });
      c.history.push({ event: 'reminder_sent', stepIndex: c.stepIndex, at: iso(tNow) });
      sent++;
    } catch (e) {
      c.history.push({ event: 'send_failed', stepIndex: c.stepIndex, error: e.message, at: iso(tNow) });
    }

    // schedule next step
    c.stepIndex++;
    const next = SCHEDULE[c.stepIndex];
    if (next) {
      c.nextRunAt = new Date(c.openedAt).getTime() + next.dayOffset * DAY;
    } else {
      // after the last reminder, hold briefly then exhaust on the next tick
      c.nextRunAt = tNow + DAY;
    }
    c.updatedAt = iso(tNow);
  }

  save(data);
  return { sent, exhausted, at: iso(tNow) };
}

function listCases(filter = {}) {
  let rows = load().cases;
  if (filter.status) rows = rows.filter(c => c.status === filter.status);
  if (filter.customer) rows = rows.filter(c => c.key === keyOf(filter.customer));
  return rows;
}

module.exports = { setSender, configureSchedule, openCase, resolveCase, cancelCase, tick, listCases };
