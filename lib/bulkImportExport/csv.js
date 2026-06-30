// lib/bulkImportExport/csv.js — Dependency-free CSV parse + stringify (RFC 4180-ish).
// parse() handles quoted fields, escaped quotes (""), commas + newlines inside quotes, and a
// configurable delimiter. Returns { headers, rows } where rows are objects keyed by header.

function parse(text, { delimiter = ',' } = {}) {
 const s = String(text == null ? '' : text);
 const records = [];
 let field = '';
 let row = [];
 let i = 0;
 let inQuotes = false;
 const pushField = () => { row.push(field); field = ''; };
 const pushRow = () => { records.push(row); row = []; };
 while (i < s.length) {
 const c = s[i];
 if (inQuotes) {
 if (c === '"') {
 if (s[i + 1] === '"') { field += '"'; i += 2; continue; }
 inQuotes = false; i += 1; continue;
 }
 field += c; i += 1; continue;
 }
 if (c === '"') { inQuotes = true; i += 1; continue; }
 if (c === delimiter) { pushField(); i += 1; continue; }
 if (c === '\r') { i += 1; continue; }
 if (c === '\n') { pushField(); pushRow(); i += 1; continue; }
 field += c; i += 1;
 }
 // flush last field/row if any content remains
 if (field.length > 0 || row.length > 0) { pushField(); pushRow(); }
 const nonEmpty = records.filter((r) => !(r.length === 1 && r[0].trim() === ''));
 if (!nonEmpty.length) return { headers: [], rows: [] };
 const headers = nonEmpty[0].map((h) => String(h).trim());
 const rows = nonEmpty.slice(1).map((r) => {
 const obj = {};
 headers.forEach((h, idx) => { obj[h] = r[idx] !== undefined ? r[idx] : ''; });
 return obj;
 });
 return { headers, rows };
}

function _cell(v) {
 const s = (v === undefined || v === null) ? '' : String(v);
 return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function stringify(rows, columns) {
 if (!Array.isArray(rows) || !rows.length) return (columns || []).join(',') + '\n';
 const cols = columns || Object.keys(rows[0]);
 const head = cols.map(_cell).join(',');
 const body = rows.map((r) => cols.map((c) => _cell(r[c])).join(',')).join('\n');
 return head + '\n' + body + '\n';
}

module.exports = { parse, stringify };
