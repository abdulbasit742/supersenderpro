'use strict';
/**
 * campaignCalendar.js — Marketing Feature #8: the campaign calendar.
 *
 * Without a calendar you accidentally message the same audience 3 times in a day and burn them out.
 * This is the planning view: schedule campaigns on dates, see a month at a glance, and get a warning
 * when too many campaigns hit the same day (frequency-cap conflict).
 *
 * Storage: JSON (data/campaign_calendar.json).
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'campaign_calendar.json');

let CONFIG = { maxPerDay: 2 }; // warn if more than this many campaigns on one day
function configure(opts = {}) { CONFIG = { ...CONFIG, ...opts }; return CONFIG; }

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { entries: [] }; }
  catch { return { entries: [] }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}
const nowIso = () => new Date().toISOString();
const dayOf = (iso) => String(iso || '').slice(0, 10);

/**
 * Schedule a calendar entry.
 * @param {Object} opts { title, date (YYYY-MM-DD), time?, segmentId?, type?, notes? }
 */
function schedule(opts = {}) {
  if (!opts.title) throw new Error('title required');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(opts.date || '')) throw new Error('date must be YYYY-MM-DD');
  const data = load();
  const entry = {
    id: `CAL-${Date.now()}-${Math.random().toString(16).slice(2,6)}`,
    title: opts.title,
    date: opts.date,
    time: opts.time || null,
    segmentId: opts.segmentId || null,
    type: opts.type || 'broadcast',
    notes: opts.notes || '',
    createdAt: nowIso()
  };
  data.entries.push(entry);
  save(data);
  // conflict warning
  const sameDay = data.entries.filter(e => e.date === entry.date).length;
  const warning = sameDay > CONFIG.maxPerDay
    ? `⚠️ ${sameDay} campaigns on ${entry.date} (cap ${CONFIG.maxPerDay}) — risk of over-messaging.`
    : null;
  return { entry, warning };
}

function remove(id) {
  const data = load();
  const before = data.entries.length;
  data.entries = data.entries.filter(e => e.id !== id);
  save(data);
  return { deleted: before - data.entries.length };
}

/** Entries for a given month (YYYY-MM) or all. */
function month(ym) {
  const data = load();
  let rows = data.entries;
  if (ym) rows = rows.filter(e => e.date.startsWith(ym));
  rows.sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
  return rows;
}

/** Day-by-day count map for a month, with over-cap flags. */
function heatmap(ym) {
  const rows = month(ym);
  const byDay = {};
  for (const e of rows) byDay[e.date] = (byDay[e.date] || 0) + 1;
  return Object.entries(byDay).map(([date, count]) => ({ date, count, overCap: count > CONFIG.maxPerDay }));
}

module.exports = { configure, schedule, remove, month, heatmap };
