// lib/analytics/eventTracker.js — Single entry point to record an analytics event. Stores
// COUNTS/METRICS only: an event name, an optional numeric value, and a small set of low-cardinality
// dimensions (e.g. channel, plan, category). Never stores message bodies, phone numbers, or PII.
// Applies retention + a hard cap so the JSON file can't grow unbounded.

const store = require('./store');
const { config } = require('./config');

const DAY = 24 * 60 * 60 * 1000;

// Keep dimensions safe: stringify, length-limit, and drop anything that looks like a contact.
function _safeDims(dims = {}) {
 const out = {};
 for (const [k, v] of Object.entries(dims || {})) {
 if (v === undefined || v === null) continue;
 const key = String(k).slice(0, 32);
 let val = String(v).slice(0, 48);
 if (/@|\+?\d{6,}/.test(val)) val = 'redacted'; // never index on emails/phone-like values
 out[key] = val;
 }
 return out;
}

function track({ event, value = 1, dimensions = {}, at } = {}) {
 if (!event) throw new Error('event is required');
 const d = store.load();
 const rec = {
 id: store.genId('ev'),
 event: String(event).slice(0, 64),
 value: Number(value) || 0,
 dims: _safeDims(dimensions),
 at: at || store.nowIso(),
 };
 d.events.push(rec);
 // Retention + cap.
 const cutoff = Date.now() - config.rawRetentionDays * DAY;
 let events = d.events.filter((e) => Date.parse(e.at) >= cutoff);
 if (events.length > config.maxEvents) events = events.slice(events.length - config.maxEvents);
 d.events = events;
 store.save(d);
 return rec;
}

function all() { return store.load().events; }
function forEvent(name) { return all().filter((e) => e.event === name); }

module.exports = { track, all, forEvent };
