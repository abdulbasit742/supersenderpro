'use strict';
/**
 * dunningEngine.js — Payments & Billing Feature #4: dunning (failed-payment recovery).
 *
 * When a subscription renewal fails (#2 moves it to past_due), we don't just cut the customer off —
 * we run a *dunning* sequence: a schedule of reminder messages + payment retries over a few days,
 * giving them every chance to pay before access ends. This is one of the highest-ROI features in any
 * SaaS: it recovers revenue you already earned.
 *
 * A dunning case has a schedule (offsets in days from when it opened), e.g. [0, 1, 3, 5]:
 *   day 0 -> remind + retry
 *   day 1 -> remind + retry
 *   day 3 -> remind + retry
 *   day 5 -> final notice; if still unpaid, give up (caller cancels the sub)
 *
 * Side effects are injected so this stays decoupled:
 *   setSender(async (customer, { text }) => ...)         // send a WhatsApp reminder (reuse broadcastHub/drip sender)
 *   setCharger(async (caseObj) => boolean)               // attempt to recharge; return true on success
 *   setHooks({ onRecovered, onGaveUp })                  // success / final-failure callbacks
 *
 * Storage: JSON (data/dunning.json). Call tick() on an interval (e.g. hourly).
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'dunning.json');

let CONFIG = {
  scheduleDays: [0, 1, 3, 5], // when to act, relative to case open
  messages: [
    'Hi {{name}}, we couldn\u2019t process your renewal. Please update your payment to keep your service active.',
    'Reminder: your SuperSender subscription is past due. Tap to pay and avoid interruption.',
    'Your access will pause soon — a quick payment keeps everything running.',
    'Final notice: this is the last reminder before your subscription is cancelled.'
  ]
};
function configure(opts = {}) { CONFIG = { ...CONFIG, ...opts }; return CONFIG; }

let sender = null;   // async (customer, { text }) => void
let charger = null;  // async (caseObj) => boolean
const hooks = { onRecovered: null, onGaveUp: null };
function setSender(fn) { sender = typeof fn === 'function' ? fn : null; }
function setCharger(fn) { charger = typeof fn === 'function' ? fn : null; }
function setHooks(h = {}) { for (const k of Object.keys(hooks)) if (typeof h[k] === 'function') hooks[k] = h[k]; return hooks; }

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
function key(customer) { return String((customer && (customer.phone || customer.email || customer.id)) || customer || '').trim(); }
function render(tpl, customer) { return String(tpl || '').replace(/\{\{\s*name\s*\}\}/g, (customer && customer.name) || 'there'); }

async function fire(name, c) { try { if (hooks[name]) await hooks[name](c); } catch { /* ignore */ } }

// ---------------------------------------------------------------------------
// Open / resolve
// ---------------------------------------------------------------------------
/** Open a dunning case (e.g. from subscription onPastDue). No double-open per customer+plan. */
function openCase(customer, planId, opts = {}) {
  const k = key(customer);
  if (!k) throw new Error('customer needs phone/email/id');
  const data = load();
  const existing = data.cases.find(c => c.key === k && c.planId === planId && c.status === 'open');
  if (existing) return existing;

  const schedule = Array.isArray(opts.scheduleDays) ? opts.scheduleDays : CONFIG.scheduleDays;
  const openedAt = now();
  const c = {
    id: `DUN-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    key: k,
    customer,
    planId: planId || null,
    amount: Number(opts.amount || 0),
    status: 'open', // open | recovered | gave_up
    schedule,
    stepIndex: 0,
    nextRunAt: openedAt + (Number(schedule[0] || 0) * DAY),
    attempts: [],
    openedAt: iso(openedAt),
    updatedAt: iso(openedAt)
  };
  data.cases.push(c);
  save(data);
  return c;
}

/** Mark recovered (payment finally went through). Call from fulfillment on a successful retry too. */
async function resolveCase(customer, planId) {
  const data = load();
  const c = data.cases.find(x => x.key === key(customer) && x.planId === planId && x.status === 'open');
  if (!c) return null;
  c.status = 'recovered';
  c.updatedAt = iso(now());
  save(data);
  await fire('onRecovered', c);
  return c;
}

// ---------------------------------------------------------------------------
// Executor
// ---------------------------------------------------------------------------
async function runStep(c) {
  const msg = render(CONFIG.messages[Math.min(c.stepIndex, CONFIG.messages.length - 1)], c.customer);
  const attempt = { stepIndex: c.stepIndex, at: iso(now()), reminded: false, retried: false, recovered: false };

  // 1) attempt a recharge if a charger is wired
  try {
    if (charger) {
      const ok = await charger(c);
      attempt.retried = true;
      if (ok) {
        attempt.recovered = true;
        c.attempts.push(attempt);
        c.status = 'recovered';
        c.updatedAt = iso(now());
        await fire('onRecovered', c);
        return;
      }
    }
  } catch { /* retry failed; fall through to reminder */ }

  // 2) send the reminder
  try {
    if (sender) { await sender(c.customer, { text: msg }); attempt.reminded = true; }
  } catch { /* sending failed; still advance so we don't loop forever */ }

  c.attempts.push(attempt);

  // 3) schedule next step or give up
  const nextIdx = c.stepIndex + 1;
  if (nextIdx >= c.schedule.length) {
    c.status = 'gave_up';
    c.updatedAt = iso(now());
    await fire('onGaveUp', c); // caller typically cancels the subscription here
  } else {
    c.stepIndex = nextIdx;
    c.nextRunAt = new Date(c.openedAt).getTime() + Number(c.schedule[nextIdx] || 0) * DAY;
    c.updatedAt = iso(now());
  }
}

/** Process all due dunning cases. Call on an interval (hourly). */
async function tick() {
  const data = load();
  const tNow = now();
  let processed = 0, recovered = 0, gaveUp = 0;
  for (const c of data.cases) {
    if (c.status !== 'open') continue;
    if (c.nextRunAt && tNow < c.nextRunAt) continue;
    await runStep(c);
    processed++;
    if (c.status === 'recovered') recovered++;
    if (c.status === 'gave_up') gaveUp++;
  }
  save(data);
  return { processed, recovered, gaveUp, at: iso(tNow) };
}

function listCases(filter = {}) {
  let rows = load().cases;
  if (filter.status) rows = rows.filter(c => c.status === filter.status);
  return rows;
}

module.exports = { configure, setSender, setCharger, setHooks, openCase, resolveCase, tick, listCases };
