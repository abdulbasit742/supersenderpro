// lib/analytics/csvExport.js — Dependency-free CSV export for events + rollups.
// Escapes quotes/commas/newlines per RFC 4180. Returns a string the route streams as text/csv.

function _cell(v) {
 const s = (v === undefined || v === null) ? '' : String(v);
 return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function toCSV(rows, columns) {
 if (!Array.isArray(rows) || !rows.length) return (columns || []).join(',') + '\n';
 const cols = columns || Object.keys(rows[0]);
 const head = cols.map(_cell).join(',');
 const body = rows.map((r) => cols.map((c) => _cell(r[c])).join(',')).join('\n');
 return head + '\n' + body + '\n';
}
function eventsCSV(events) {
 const rows = events.map((e) => ({ id: e.id, event: e.event, value: e.value, at: e.at, dims: JSON.stringify(e.dims || {}) }));
 return toCSV(rows, ['id', 'event', 'value', 'at', 'dims']);
}

module.exports = { toCSV, eventsCSV };
