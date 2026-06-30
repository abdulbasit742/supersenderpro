'use strict';
/**
 * autoResponder.js — Inbound Feature #3: business-hours auto-responder.
 *
 * Instant acknowledgement matters: a customer who messages at midnight should get "we're closed,
 * we'll reply at 9am" immediately, and a first-time contact should get a warm greeting. This decides
 * whether to auto-reply BEFORE the AI agent runs, so customers are never left on read.
 *
 * Rules:
 *   - first-ever contact -> greeting (once)
 *   - outside business hours -> away message (throttled once per closed-window)
 *   - inside hours, returning contact -> no auto-reply (let the bot/agent handle it)
 *
 * Reuses lib/businessHours.js if available to decide open/closed; otherwise a simple env window.
 * Storage: JSON (data/autoresponder_state.json).
 */

const fs = require('fs');
const path = require('path');

let businessHours = null;
try { businessHours = require('../businessHours'); } catch { businessHours = null; }

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'autoresponder_state.json');

let CONFIG = {
  greeting: 'Hi! 👋 Thanks for reaching out. How can we help you today?',
  awayMessage: "Thanks for your message! We're currently closed 🕒. Our team will reply during business hours.",
  openHour: 9,
  closeHour: 21,
  timezoneOffsetH: 5,        // Asia/Karachi UTC+5
  awayThrottleHours: 6       // don't repeat the away message more than this often per contact
};
function configure(opts = {}) { CONFIG = { ...CONFIG, ...opts }; return CONFIG; }

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { contacts: {} }; }
  catch { return { contacts: {} }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}
const nowMs = () => Date.now();
const normPhone = (v) => String(v || '').replace(/[^\d]/g, '');

function isOpen() {
  if (businessHours && typeof businessHours.isOpen === 'function') {
    try { return !!businessHours.isOpen(); } catch { /* fall through */ }
  }
  const utcH = new Date().getUTCHours();
  const localH = (utcH + CONFIG.timezoneOffsetH + 24) % 24;
  return localH >= CONFIG.openHour && localH < CONFIG.closeHour;
}

/**
 * Decide the auto-reply for an inbound message. Returns { reply } or { reply: null }.
 * Call this in the message router BEFORE the AI agent.
 */
function onInbound(phone) {
  const p = normPhone(phone);
  if (!p) return { reply: null };
  const data = load();
  const c = data.contacts[p] || { firstSeen: false, lastAwayAt: 0 };
  let reply = null;

  if (!c.firstSeen) {
    c.firstSeen = true;
    reply = CONFIG.greeting;
  } else if (!isOpen()) {
    if (nowMs() - (c.lastAwayAt || 0) > CONFIG.awayThrottleHours * 3600000) {
      c.lastAwayAt = nowMs();
      reply = CONFIG.awayMessage;
    }
  }

  data.contacts[p] = c;
  save(data);
  return { reply, open: isOpen() };
}

module.exports = { configure, isOpen, onInbound };
