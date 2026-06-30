// lib/analytics/funnel.js — Ordered funnel conversion analysis over tracked events.
// Given a list of step event names, returns per-step counts + conversion + drop-off rates.
// Counts are by occurrence (volume funnel); a window can scope events to a date range.

function analyze(events, { steps = [], since, until } = {}) {
 const from = since ? Date.parse(since) : -Infinity;
 const to = until ? Date.parse(until) : Infinity;
 const inWindow = events.filter((e) => { const t = Date.parse(e.at); return t >= from && t <= to; });
 const counts = steps.map((name) => inWindow.filter((e) => e.event === name).length);
 const top = counts[0] || 0;
 const rows = steps.map((name, i) => {
 const c = counts[i];
 const prev = i === 0 ? c : counts[i - 1];
 return {
 step: name,
 count: c,
 fromTopPct: top ? Math.round((c / top) * 1000) / 10 : 0,
 fromPrevPct: prev ? Math.round((c / prev) * 1000) / 10 : 0,
 dropFromPrev: Math.max(0, prev - c),
 };
 });
 return {
 steps: rows,
 overallConversionPct: top ? Math.round(((counts[counts.length - 1] || 0) / top) * 1000) / 10 : 0,
 window: { since: since || null, until: until || null },
 };
}

module.exports = { analyze };
