'use strict';
/**
 * notifications.js — Notify Feature #1: internal notification preferences + dispatch.
 *
 * Lots of features want to alert a user (health down, payment failed, support escalated, daily
 * digest). Without preferences that's either spam or silence. This is the central switchboard:
 * each user picks which event types they care about and on which channel (WhatsApp/email/none),
 * plus quiet hours and a global mute. notify() checks prefs and routes to injected senders.
 *
 * Channel senders are injected (wa/email), so this has no hard transport deps.
 * Storage: JSON (data/notification_prefs.json).
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'notification_prefs.json');

const EVENT_TYPES = ['system_health', 'payment_failed', 'support_escalated', 'daily_digest', 'new_lead', 'campaign_done'];
const CHANNELS = ['whatsapp', 'email', 'none'];

const senders = { whatsapp: null, email: null }; // each: async (to, subject, body) => any
function setChannelSender(channel, fn) { if (channel in senders && typeof fn === 'function') senders[channel] = fn; }

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { prefs: {} }; }
  catch { return { prefs: {} }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}
const nowIso = () => new Date().toISOString();

function defaults() {
  // sensible defaults: important stuff on WhatsApp, noise off
  const map = {};
  for (const e of EVENT_TYPES) map[e] = (e === 'new_lead' || e === 'campaign_done') ? 'none' : 'whatsapp';
  return map;
}

function getPrefs(userId) {
  const data = load();
  const p = data.prefs[String(userId)];
  return p || { userId: String(userId), channels: defaults(), muted: false, quietStartHour: 23, quietEndHour: 8, contact: {} };
}

function setPrefs(userId, patch = {}) {
  const data = load();
  const cur = getPrefs(userId);
  const next = {
    ...cur,
    ...patch,
    channels: { ...cur.channels, ...(patch.channels || {}) },
    contact: { ...cur.contact, ...(patch.contact || {}) },
    userId: String(userId),
    updatedAt: nowIso()
  };
  // validate channel choices
  for (const [evt, ch] of Object.entries(next.channels)) {
    if (!CHANNELS.includes(ch)) next.channels[evt] = 'none';
  }
  data.prefs[String(userId)] = next;
  save(data);
  return next;
}

function inQuietHours(p) {
  const utcH = new Date().getUTCHours();
  const localH = (utcH + 5 + 24) % 24; // Asia/Karachi UTC+5
  const s = p.quietStartHour, e = p.quietEndHour;
  return s < e ? (localH >= s && localH < e) : (localH >= s || localH < e);
}

/**
 * Notify a user of an event, honouring their prefs.
 * @param {string} userId
 * @param {Object} ev { type, subject?, body, urgent? }
 * @returns {Promise<Object>} { delivered, channel, reason? }
 */
async function notify(userId, ev = {}) {
  if (!EVENT_TYPES.includes(ev.type)) return { delivered: false, reason: 'unknown event type' };
  const p = getPrefs(userId);
  if (p.muted && !ev.urgent) return { delivered: false, reason: 'muted' };
  const channel = p.channels[ev.type] || 'none';
  if (channel === 'none') return { delivered: false, reason: 'channel none' };
  if (!ev.urgent && inQuietHours(p)) return { delivered: false, reason: 'quiet hours' };

  const send = senders[channel];
  if (!send) return { delivered: false, reason: `no ${channel} sender wired` };
  const to = channel === 'whatsapp' ? p.contact.phone : p.contact.email;
  if (!to) return { delivered: false, reason: `no ${channel} address on file` };

  try {
    await send(to, ev.subject || 'SuperSender', ev.body || '');
    return { delivered: true, channel };
  } catch (e) {
    return { delivered: false, channel, reason: e.message };
  }
}

module.exports = { EVENT_TYPES, CHANNELS, setChannelSender, getPrefs, setPrefs, notify };
