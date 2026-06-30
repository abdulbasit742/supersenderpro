'use strict';
/**
 * smartSendTime.js — Sending Feature #3: best-time-to-send per contact.
 *
 * Messages sent when a contact is usually active get read more. This records when each contact
 * engages (reads/replies), builds a simple per-hour histogram, and suggests the next good send time
 * for them. With no history it falls back to a default window. Always clamped to quiet hours so we
 * never recommend 3am.
 *
 * Feed it engagement signals from the inbound router (a reply = engagement at that hour). The
 * scheduler/drip can call nextSendTime() to delay a send to the contact's likely-active window.
 *
 * Storage: JSON (data/send_time_history.json).
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'send_time_history.json');

let CONFIG = {
  defaultHour: 11,        // 11am local if no history
  quietStartHour: 22,
  quietEndHour: 8,
  timezoneOffsetH: 5      // Asia/Karachi
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
const normPhone = (v) => String(v || '').replace(/[^\d]/g, '');

function localHourNow() {
  return (new Date().getUTCHours() + CONFIG.timezoneOffsetH + 24) % 24;
}
function isQuiet(hour) {
  const s = CONFIG.quietStartHour, e = CONFIG.quietEndHour;
  return s < e ? (hour >= s && hour < e) : (hour >= s || hour < e);
}

/** Record an engagement (reply/read) for a contact at the current local hour. */
function recordEngagement(phone) {
  const p = normPhone(phone);
  if (!p) return;
  const data = load();
  const c = data.contacts[p] || { hist: new Array(24).fill(0), total: 0 };
  const h = localHourNow();
  c.hist[h] = (c.hist[h] || 0) + 1;
  c.total += 1;
  data.contacts[p] = c;
  save(data);
}

/** Best local hour for a contact (peak engagement), clamped out of quiet hours. */
function bestHour(phone) {
  const c = load().contacts[normPhone(phone)];
  let hour = CONFIG.defaultHour;
  if (c && c.total > 0) {
    let best = -1, bestH = CONFIG.defaultHour;
    for (let h = 0; h < 24; h++) {
      if (isQuiet(h)) continue;
      if ((c.hist[h] || 0) > best) { best = c.hist[h] || 0; bestH = h; }
    }
    hour = bestH;
  }
  if (isQuiet(hour)) hour = CONFIG.quietEndHour; // push to start of allowed window
  return hour;
}

/**
 * Next send time (ms epoch) for a contact: today at bestHour if still ahead, else tomorrow.
 */
function nextSendTime(phone) {
  const hour = bestHour(phone);
  const now = new Date();
  // build a Date at the target LOCAL hour (approx via offset)
  const target = new Date(now);
  const localNow = localHourNow();
  let addHours = hour - localNow;
  if (addHours <= 0) addHours += 24; // next occurrence
  target.setTime(now.getTime() + addHours * 3600000);
  return { atMs: target.getTime(), atIso: target.toISOString(), hour };
}

module.exports = { configure, recordEngagement, bestHour, nextSendTime };
