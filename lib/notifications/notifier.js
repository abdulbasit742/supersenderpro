'use strict';
/**
 * notifier.js — Notifications Feature #1: preference-aware alerting.
 *
 * Many parts of the system want to alert someone: health monitor (#ops1), dunning, escalations,
 * daily digest. Without one place + preferences, users get spammed or miss what matters. This is the
 * single notifier: each user sets which event TYPES they care about and on which CHANNELS
 * (WhatsApp / email), plus quiet hours. notify() only delivers to opted-in channels.
 *
 * Channel senders are injected (wa/email), so this has no hard deps. Storage: JSON (data/notif_prefs.json).
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'notif_prefs.json');

const EVENT_TYPES = ['system_health', 'payment', 'escalation', 'daily_digest', 'new_lead', 'campaign_done'];
const CHANNELS = ['whatsapp', 'email'];

const senders = {}; // channel -> async (to, subject, body) => any
function setChannelSender(channel, fn) { if (CHANNELS.includes(channel) && typeof fn === 'function') senders[channel] = fn; }

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { prefs: {} }; }
  catch { return { prefs: {} }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}
const nowMs = () => Date.now();

function defaultPrefs(userId) {
  return {
    userId,
    whatsapp: '', email: '',
    // by default: everything on WhatsApp, digest also email
    subscriptions: Object.fromEntries(EVENT_TYPES.map(t => [t, { whatsapp: true, email: t === 'daily_digest' }])),
    quietStartHour: 23, quietEndHour: 8, timezoneOffsetH: 5,
    _lastSent: {}
  };
}

function getPrefs(userId) {
  const data = load();
  return data.prefs[String(userId)] || defaultPrefs(String(userId));
}

function setPrefs(userId, patch = {}) {
  const data = load();
  const cur = data.prefs[String(userId)] || defaultPrefs(String(userId));
  const next = { ...cur, ...patch };
  if (patch.subscriptions) next.subscriptions = { ...cur.subscriptions, ...patch.subscriptions };
  data.prefs[String(userId)] = next;
  save(data);
  return next;
}

function inQuiet(p) {
  const localH = (new Date().getUTCHours() + (p.timezoneOffsetH || 0) + 24) % 24;
  const s = p.quietStartHour, e = p.quietEndHour;
  return s < e ? (localH >= s && localH < e) : (localH >= s || localH < e);
}

/**
 * Notify a user about an event. Routes to each opted-in channel (unless quiet hours, for non-urgent).
 * @param {string} userId
 * @param {string} type   one of EVENT_TYPES
 * @param {Object} payload { subject, body, urgent? }
 */
async function notify(userId, type, payload = {}) {
  const p = getPrefs(userId);
  const sub = (p.subscriptions || {})[type] || {};
  const results = [];
  // dedupe identical bursts (same type) within 60s
  const last = (p._lastSent || {})[type] || 0;
  if (nowMs() - last < 60000 && !payload.urgent) return { delivered: 0, skipped: 'deduped' };

  const quiet = inQuiet(p) && !payload.urgent;
  for (const ch of CHANNELS) {
    if (!sub[ch]) continue;
    if (quiet) { results.push({ channel: ch, skipped: 'quiet_hours' }); continue; }
    const to = ch === 'whatsapp' ? p.whatsapp : p.email;
    if (!to || !senders[ch]) { results.push({ channel: ch, skipped: 'no_target_or_sender' }); continue; }
    try { await senders[ch](to, payload.subject || type, payload.body || ''); results.push({ channel: ch, sent: true }); }
    catch (e) { results.push({ channel: ch, error: e.message }); }
  }
  // record last-sent
  const data = load();
  const stored = data.prefs[String(userId)] || defaultPrefs(String(userId));
  stored._lastSent = { ...(stored._lastSent || {}), [type]: nowMs() };
  data.prefs[String(userId)] = stored;
  save(data);

  return { delivered: results.filter(r => r.sent).length, results };
}

module.exports = { EVENT_TYPES, CHANNELS, setChannelSender, getPrefs, setPrefs, notify };
