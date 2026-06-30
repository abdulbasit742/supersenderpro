'use strict';
/**
 * sendGuard.js — Sending Feature #1: the anti-ban chokepoint.
 *
 * Right now broadcast, drip, support, and dunning each send on their own. Nothing enforces a GLOBAL
 * limit, so together they can blast the WhatsApp number and get it banned. This is the single gate
 * every outbound message should pass through:
 *   - per-number hourly + daily caps
 *   - human-like jitter between sends (randomised delay, not a fixed 3s)
 *   - quiet hours (don't message people at 3am)
 *   - opt-out check (never message someone who said STOP)
 *   - dedupe (don't send the identical message to the same person twice in a short window)
 *
 * Usage: wrap your real sender once, then everything sends through guard.send(...).
 *   const guardedSend = guard.wrap(async (to, text) => waClient.sendMessage(to, text));
 *   await guardedSend(phone, text);
 *
 * Storage: in-memory counters (fine per-process). For multi-instance, back the counters with Redis
 * (same API). JSON not needed — these are short-lived rate windows.
 */

let CONFIG = {
  perHour: 60,            // max sends per number per rolling hour
  perDay: 500,           // max sends per number per rolling day
  minDelayMs: 2500,      // floor between sends
  maxDelayMs: 6000,      // ceiling between sends (random within [min,max] = jitter)
  quietStartHour: 23,    // 11pm
  quietEndHour: 8,       // 8am  (no sends in [quietStart, quietEnd))
  timezoneOffsetH: 5,    // Asia/Karachi = UTC+5 (for quiet-hours math)
  dedupeWindowMs: 60000  // identical (to,text) within this window is skipped
};
function configure(opts = {}) { CONFIG = { ...CONFIG, ...opts }; return CONFIG; }

// opt-out check hook: (phone) => boolean (true = allowed to send)
let isAllowed = null;
function setOptOutCheck(fn) { isAllowed = typeof fn === 'function' ? fn : null; }

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const nowMs = () => Date.now();
const normPhone = (v) => String(v || '').replace(/[^\d@.]/g, '');

// per-number rolling timestamps + last dedupe map
const sends = new Map();   // phone -> number[] (timestamps)
const lastSent = new Map(); // `${phone}|${hash}` -> ts
let lastGlobalSendAt = 0;

function hash(text) {
  let h = 0; const s = String(text || '');
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
  return String(h);
}
function prune(arr, windowMs) {
  const cutoff = nowMs() - windowMs;
  return arr.filter(t => t >= cutoff);
}
function inQuietHours() {
  const utcH = new Date().getUTCHours();
  const localH = (utcH + CONFIG.timezoneOffsetH + 24) % 24;
  const { quietStartHour: s, quietEndHour: e } = CONFIG;
  return s < e ? (localH >= s && localH < e) : (localH >= s || localH < e);
}

/** Check (without sending) whether a message to `phone` is allowed right now. */
function check(phone, text) {
  const p = normPhone(phone);
  if (isAllowed && !isAllowed(p.replace(/@.*/, ''))) return { ok: false, reason: 'opted_out' };
  if (inQuietHours()) return { ok: false, reason: 'quiet_hours' };

  const key = `${p}|${hash(text)}`;
  const last = lastSent.get(key);
  if (last && (nowMs() - last) < CONFIG.dedupeWindowMs) return { ok: false, reason: 'duplicate' };

  const hist = prune(sends.get(p) || [], 86400000);
  const hourCount = prune(hist, 3600000).length;
  if (hourCount >= CONFIG.perHour) return { ok: false, reason: 'hourly_cap' };
  if (hist.length >= CONFIG.perDay) return { ok: false, reason: 'daily_cap' };
  return { ok: true };
}

function record(phone, text) {
  const p = normPhone(phone);
  const hist = prune(sends.get(p) || [], 86400000);
  hist.push(nowMs());
  sends.set(p, hist);
  lastSent.set(`${p}|${hash(text)}`, nowMs());
}

async function jitterDelay() {
  const since = nowMs() - lastGlobalSendAt;
  const target = CONFIG.minDelayMs + Math.random() * (CONFIG.maxDelayMs - CONFIG.minDelayMs);
  if (since < target) await sleep(target - since);
  lastGlobalSendAt = nowMs();
}

/**
 * Wrap a raw sender into a guarded one.
 * @param {Function} rawSend async (to, text, ...rest) => any
 * @returns {Function} async (to, text, ...rest) => { sent, skipped?, reason? }
 */
function wrap(rawSend) {
  if (typeof rawSend !== 'function') throw new Error('wrap needs a sender function');
  return async function guardedSend(to, text, ...rest) {
    const verdict = check(to, text);
    if (!verdict.ok) return { sent: false, skipped: true, reason: verdict.reason };
    await jitterDelay();
    const out = await rawSend(to, text, ...rest);
    record(to, text);
    return { sent: true, result: out };
  };
}

/** Current usage snapshot for a number (for dashboards/debug). */
function usage(phone) {
  const p = normPhone(phone);
  const hist = prune(sends.get(p) || [], 86400000);
  return {
    phone: p,
    lastHour: prune(hist, 3600000).length,
    lastDay: hist.length,
    perHour: CONFIG.perHour,
    perDay: CONFIG.perDay,
    quietHoursNow: inQuietHours()
  };
}

module.exports = { configure, setOptOutCheck, check, wrap, usage };
