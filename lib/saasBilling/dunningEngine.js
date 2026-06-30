'use strict';
/**
 * dunningEngine.js — Payments & Billing Feature #4: dunning (failed-payment recovery).
 *
 * When a renewal payment fails, the subscription enters grace (Feature #2). Dunning is what actually
 * tries to SAVE that revenue: a scheduled series of retry-charge attempts + reminder messages over
 * several days. If the customer pays (or a retry succeeds), the case is resolved. If the whole
 * schedule is exhausted, we give up and let the subscription expire.
 *
 * Steps run per case, time-based, like a mini drip:
 *   { dayOffset: 0, action: 'remind' }       -> send a "your payment failed" message
 *   { dayOffset: 1, action: 'retry' }         -> attempt the charge again
 *   { dayOffset: 3, action: 'remind' }        -> nudge
 *   { dayOffset: 5, action: 'final_notice' }  -> last warning
 * After the last step + a grace, the case is marked 'failed' and onGiveUp fires.
 *
 * Side effects are injected (decoupled + testable):
 *   setHooks({ notify, retryCharge, onRecover, onGiveUp })
 *     notify({ case, step, message }) -> send a WhatsApp/email message
 *     retryCharge({ case }) -> attempt payment; return truthy on success
 *     onRecover({ case }) / onGiveUp({ case })
 *
 * Storage: JSON (data/dunning.json).
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'dunning.json');
const DAY = 86400000;

// Default schedule (override via configure). dayOffset = days after the case opened.
let SCHEDULE = [
  { dayOffset: 0, action: 'remind',       message: 'Your payment didn\'t go through. Please update your payment to keep your subscription active.' },
  { dayOffset: 1, action: 'retry',        message: '' },
  { dayOffset: 3, action: 'remind',       message: 'Reminder: your subscription is past due. Tap to pay and avoid interruption.' },
  { dayOffset: 5, action: 'retry',        message: '' },
  { dayOffset: 7, action: 'final_notice', message: 'Final notice: your subscription will be cancelled tomorrow unless payment is received.' }
];
let CONFIG = { giveUpGraceDays: 1 };

const hooks = { notify: null, retryCharge: null, onRecover: null, onGiveUp: null };

function configure(opts = {}) {
  if (Array.isArray(opts.schedule) && opts.schedule.length) SCHEDULE = opts.schedule.slice().sort((a, b) => a.dayOffset - b.dayOffset);
  if (opts.giveUpGraceDays != null) CONFIG.giveUpGraceDays = Number(opts.giveUpGraceDays);
  return { schedule: SCHEDULE, ...CONFIG };
}
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
function caseKey(customer, planId) {
  const k = String((customer && (customer.phone || customer.email || customer.id)) || customer || '').trim();
  return `DUN-${k}-${planId}`;
}
async function fire(name, payload) { try { if (hooks[name]) return await hooks[name](payload); } catch { /* never break the sweep */ } return undefined; }

/**
 * Open (or reuse) a dunning case for a failed renewal. Idempotent: an open case isn't duplicated.
 */
function openCase(customer, planId, meta = {}) {
  const data = load();
  const id = caseKey(customer, planId);
  let c = data.cases.find(x => x.id === id && x.status === 'open');
  if (c) return c;
  c = {
    id,
    customer,
    planId,
    status: 'open', // open | recovered | failed
    openedAt: iso(now()),
    stepIndex: 0,
    attempts: 0,
    meta,
    history: [],
    updatedAt: iso(now())
  };
  data.cases.push(c);
  save(data);
  return c;
}

function resolveCase(customer, planId, status = 'recovered') {
  const data = load();
  const c = data.cases.find(x => x.id === caseKey(customer, planId) && x.status === 'open');
  if (!c) return null;
  c.status = status;
  c.updatedAt = iso(now());
  save(data);
  return c;
}

function stepDueAt(openedAtMs, step) { return openedAtMs + Number(step.dayOffset || 0) * DAY; }

/**
 * Process all open dunning cases. Call on a daily (or hourly) cron.
 * For each due step: 'retry' attempts a charge (success -> recover), 'remind'/'final_notice' notify.
 * After the last step + grace, give up.
 */
async function tick() {
  const data = load();
  const tNow = now();
  let processed = 0, recovered = 0, notified = 0, gaveUp = 0;

  for (const c of data.cases) {
    if (c.status !== 'open') continue;
    const openedAtMs = new Date(c.openedAt).getTime();
    processed++;

    // run any steps that are now due and not yet executed
    while (c.stepIndex < SCHEDULE.length) {
      const step = SCHEDULE[c.stepIndex];
      if (tNow < stepDueAt(openedAtMs, step)) break; // not due yet

      if (step.action === 'retry') {
        c.attempts++;
        const ok = await fire('retryCharge', { case: c });
        c.history.push({ stepIndex: c.stepIndex, action: 'retry', result: ok ? 'success' : 'failed', at: iso(tNow) });
        if (ok) {
          c.status = 'recovered';
          c.updatedAt = iso(tNow);
          recovered++;
          await fire('onRecover', { case: c });
          break;
        }
      } else {
        await fire('notify', { case: c, step, message: step.message });
        c.history.push({ stepIndex: c.stepIndex, action: step.action, result: 'sent', at: iso(tNow) });
        notified++;
      }
      c.stepIndex++;
      c.updatedAt = iso(tNow);
    }

    // exhausted the schedule? give up after the grace.
    if (c.status === 'open' && c.stepIndex >= SCHEDULE.length) {
      const lastStep = SCHEDULE[SCHEDULE.length - 1] || { dayOffset: 0 };
      const giveUpAt = stepDueAt(openedAtMs, lastStep) + CONFIG.giveUpGraceDays * DAY;
      if (tNow >= giveUpAt) {
        c.status = 'failed';
        c.updatedAt = iso(tNow);
        gaveUp++;
        await fire('onGiveUp', { case: c });
      }
    }
  }

  save(data);
  return { processed, recovered, notified, gaveUp, at: iso(tNow) };
}

function getCase(customer, planId) { return load().cases.find(c => c.id === caseKey(customer, planId)) || null; }
function listCases(status) { const rows = load().cases; return status ? rows.filter(c => c.status === status) : rows; }
function stats() {
  const rows = load().cases;
  const by = (s) => rows.filter(c => c.status === s).length;
  const recovered = by('recovered'), failed = by('failed');
  const closed = recovered + failed;
  return { open: by('open'), recovered, failed, recoveryRatePct: closed ? Math.round((recovered / closed) * 1000) / 10 : 0 };
}

module.exports = { configure, setHooks, openCase, resolveCase, tick, getCase, listCases, stats };
