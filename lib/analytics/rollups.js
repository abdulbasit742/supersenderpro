// lib/analytics/rollups.js — Time-series + breakdown aggregations over tracked events.
// Pure functions; no side effects. Buckets by day/week/month and breaks down by a dimension.

function _bucketKey(iso, period) {
 const d = new Date(iso);
 if (period === 'month') return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
 if (period === 'week') {
 const onejan = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
 const week = Math.ceil((((d - onejan) / 86400000) + onejan.getUTCDay() + 1) / 7);
 return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
 }
 return d.toISOString().slice(0, 10); // day
}

// Time series of count + sum(value) for an event (or all events) bucketed by period.
function timeSeries(events, { event, period = 'day' } = {}) {
 const filtered = event ? events.filter((e) => e.event === event) : events;
 const map = new Map();
 for (const e of filtered) {
 const k = _bucketKey(e.at, period);
 const cur = map.get(k) || { bucket: k, count: 0, sum: 0 };
 cur.count += 1; cur.sum += Number(e.value) || 0;
 map.set(k, cur);
 }
 return [...map.values()].sort((a, b) => (a.bucket < b.bucket ? -1 : 1));
}

// Breakdown of count + sum by a single dimension value (e.g. channel, plan).
function breakdown(events, { event, dimension } = {}) {
 const filtered = event ? events.filter((e) => e.event === event) : events;
 const map = new Map();
 for (const e of filtered) {
 const key = (e.dims && e.dims[dimension] !== undefined) ? e.dims[dimension] : '(none)';
 const cur = map.get(key) || { key, count: 0, sum: 0 };
 cur.count += 1; cur.sum += Number(e.value) || 0;
 map.set(key, cur);
 }
 return [...map.values()].sort((a, b) => b.count - a.count);
}

function totals(events, { event } = {}) {
 const filtered = event ? events.filter((e) => e.event === event) : events;
 return { count: filtered.length, sum: filtered.reduce((s, e) => s + (Number(e.value) || 0), 0) };
}

module.exports = { timeSeries, breakdown, totals };
