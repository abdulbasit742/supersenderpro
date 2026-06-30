// lib/auditLog/csv.js — Tiny dependency-free CSV stringify (RFC 4180 escaping) for trail export.

function _cell(v) {
 const s = (v === undefined || v === null) ? '' : String(v);
 return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function stringify(rows, columns) {
 if (!Array.isArray(rows) || !rows.length) return (columns || []).join(',') + '\n';
 const cols = columns || Object.keys(rows[0]);
 return cols.map(_cell).join(',') + '\n' + rows.map((r) => cols.map((c) => _cell(r[c])).join(',')).join('\n') + '\n';
}

module.exports = { stringify };
