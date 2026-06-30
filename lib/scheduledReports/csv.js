// lib/scheduledReports/csv.js — Dependency-free CSV stringify (RFC 4180 escaping). Flattens a flat
// object map or an array of row objects into CSV text.

function _cell(v) {
 const s = (v === undefined || v === null) ? '' : (typeof v === 'object' ? JSON.stringify(v) : String(v));
 return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function fromRows(rows, columns) {
 if (!Array.isArray(rows) || !rows.length) return (columns || []).join(',') + '\n';
 const cols = columns || Object.keys(rows[0]);
 return cols.map(_cell).join(',') + '\n' + rows.map((r) => cols.map((c) => _cell(r[c])).join(',')).join('\n') + '\n';
}
// Turn a flat {key:value} object into a 2-column key,value CSV.
function fromObject(obj) {
 const rows = Object.entries(obj || {}).map(([key, value]) => ({ key, value }));
 return fromRows(rows, ['key', 'value']);
}

module.exports = { fromRows, fromObject };
