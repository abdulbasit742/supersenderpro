'use strict';
/**
 * campaignAnalytics.js — Marketing Automation Feature #5: real reporting.
 *
 * The old `analyticsEngine.js` only appended events to a file — no rates, no rollups. This records
 * marketing events AND aggregates them into the numbers that actually matter: delivery rate, open
 * rate, click-through rate, conversion rate, and revenue — per campaign, per segment, and overall.
 *
 * Event funnel (each step implies the ones before it for rate math):
 *   sent -> delivered -> read(open) -> click -> conversion
 *
 * Storage: JSON (data/marketing_analytics_events.json), matching the rest of the app.
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'marketing_analytics_events.json');

const EVENT_TYPES = ['sent', 'delivered', 'read', 'click', 'conversion'];

function load() {
  try {
    return fs.existsSync(DATA_FILE)
      ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
      : { events: [] };
  } catch {
    return { events: [] };
  }
}
function save(d) {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2));
  } catch { /* best-effort */ }
}

const nowIso = () => new Date().toISOString();
function pct(part, whole) {
  if (!whole) return 0;
  return Math.round((part / whole) * 1000) / 10; // one decimal place
}

/**
 * Record a marketing event.
 * @param {Object} ev
 * @param {string} ev.campaignId   required — which campaign/broadcast
 * @param {string} ev.type         one of EVENT_TYPES
 * @param {string} [ev.contact]    phone/id of the recipient
 * @param {string} [ev.segmentId]  segment this send targeted (for per-segment rollups)
 * @param {number} [ev.revenue]    revenue attributed (use on 'conversion')
 * @param {string} [ev.channel]    'whatsapp' | 'broadcast' | etc.
 */
function record(ev = {}) {
  if (!ev.campaignId) throw new Error('campaignId is required');
  if (!EVENT_TYPES.includes(ev.type)) throw new Error(`invalid type "${ev.type}". Valid: ${EVENT_TYPES.join(', ')}`);
  const data = load();
  const row = {
    id: `MEV-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    campaignId: String(ev.campaignId),
    type: ev.type,
    contact: ev.contact || null,
    segmentId: ev.segmentId || null,
    revenue: Number(ev.revenue || 0),
    channel: ev.channel || null,
    at: ev.at || nowIso()
  };
  data.events.push(row);
  if (data.events.length > 100000) data.events = data.events.slice(-100000);
  save(data);
  return row;
}

/** Convenience: record many events at once (e.g. a whole broadcast's 'sent' batch). */
function recordMany(events = []) {
  let n = 0;
  for (const e of events) { try { record(e); n++; } catch { /* skip bad row */ } }
  return { recorded: n, total: events.length };
}

function emptyCounts() {
  return { sent: 0, delivered: 0, read: 0, click: 0, conversion: 0, revenue: 0 };
}

function countsToReport(c) {
  return {
    ...c,
    rates: {
      delivery:   pct(c.delivered, c.sent),
      open:       pct(c.read, c.delivered || c.sent),
      clickThrough: pct(c.click, c.read || c.delivered || c.sent),
      conversion: pct(c.conversion, c.sent)
    },
    revenuePerConversion: c.conversion ? Math.round((c.revenue / c.conversion) * 100) / 100 : 0
  };
}

function accumulate(target, ev) {
  if (ev.type === 'conversion') {
    target.conversion += 1;
    target.revenue += Number(ev.revenue || 0);
  } else {
    target[ev.type] += 1;
  }
}

/** Full report for one campaign. */
function campaignReport(campaignId) {
  const data = load();
  const counts = emptyCounts();
  for (const ev of data.events) {
    if (ev.campaignId === String(campaignId)) accumulate(counts, ev);
  }
  return { campaignId: String(campaignId), ...countsToReport(counts) };
}

/** Per-segment rollup for one campaign (how each targeted segment performed). */
function campaignBySegment(campaignId) {
  const data = load();
  const bySeg = {};
  for (const ev of data.events) {
    if (ev.campaignId !== String(campaignId)) continue;
    const k = ev.segmentId || '(none)';
    if (!bySeg[k]) bySeg[k] = emptyCounts();
    accumulate(bySeg[k], ev);
  }
  return Object.entries(bySeg).map(([segmentId, counts]) => ({ segmentId, ...countsToReport(counts) }));
}

/** Rollup for one segment across ALL campaigns. */
function segmentReport(segmentId) {
  const data = load();
  const counts = emptyCounts();
  for (const ev of data.events) {
    if ((ev.segmentId || null) === segmentId) accumulate(counts, ev);
  }
  return { segmentId, ...countsToReport(counts) };
}

/** Overall marketing summary, optionally within a date range (ISO strings). */
function overview({ from, to } = {}) {
  const data = load();
  const fromT = from ? new Date(from).getTime() : -Infinity;
  const toT = to ? new Date(to).getTime() : Infinity;
  const counts = emptyCounts();
  const campaigns = new Set();
  for (const ev of data.events) {
    const t = new Date(ev.at).getTime();
    if (t < fromT || t > toT) continue;
    accumulate(counts, ev);
    campaigns.add(ev.campaignId);
  }
  return { campaigns: campaigns.size, ...countsToReport(counts), from: from || null, to: to || null };
}

module.exports = {
  EVENT_TYPES,
  record,
  recordMany,
  campaignReport,
  campaignBySegment,
  segmentReport,
  overview
};
