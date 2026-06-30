// lib/bulkImportExport/columnMapper.js — Map arbitrary CSV columns to the canonical contact shape.
// An explicit mapping ({ phone:'Mobile', name:'Full Name', fields:{ city:'Town' } }) wins; otherwise
// a best-effort auto-map matches common header names. Unmapped columns can be folded into fields.

const AUTO = {
 phone: ['phone', 'mobile', 'number', 'cell', 'whatsapp', 'msisdn', 'contact'],
 email: ['email', 'e-mail', 'mail'],
 name: ['name', 'full name', 'fullname', 'customer', 'contact name'],
};

function _findHeader(headers, candidates) {
 const lower = headers.map((h) => ({ h, l: String(h).toLowerCase().trim() }));
 for (const cand of candidates) { const hit = lower.find((x) => x.l === cand); if (hit) return hit.h; }
 for (const cand of candidates) { const hit = lower.find((x) => x.l.includes(cand)); if (hit) return hit.h; }
 return null;
}

// Build an effective mapping from headers + an optional explicit mapping.
function buildMapping(headers, explicit = {}) {
 const mapping = {
 phone: explicit.phone || _findHeader(headers, AUTO.phone),
 email: explicit.email || _findHeader(headers, AUTO.email),
 name: explicit.name || _findHeader(headers, AUTO.name),
 tagsColumn: explicit.tagsColumn || _findHeader(headers, ['tags', 'tag', 'labels']),
 fields: explicit.fields && typeof explicit.fields === 'object' ? explicit.fields : {},
 foldUnmappedIntoFields: explicit.foldUnmappedIntoFields !== false,
 };
 return mapping;
}

// Apply the mapping to one raw CSV row object -> canonical mapped shape.
function applyMapping(rawRow, mapping, headers) {
 const used = new Set([mapping.phone, mapping.email, mapping.name, mapping.tagsColumn].filter(Boolean));
 const fields = {};
 // explicit field mappings: { canonicalKey: headerName }
 for (const [key, header] of Object.entries(mapping.fields || {})) {
 if (header && rawRow[header] !== undefined) { fields[key] = rawRow[header]; used.add(header); }
 }
 if (mapping.foldUnmappedIntoFields) {
 for (const h of headers) { if (!used.has(h)) { const v = rawRow[h]; if (v !== undefined && String(v).trim() !== '') fields[h] = v; } }
 }
 return {
 phone: mapping.phone ? rawRow[mapping.phone] : undefined,
 email: mapping.email ? rawRow[mapping.email] : undefined,
 name: mapping.name ? rawRow[mapping.name] : undefined,
 tags: mapping.tagsColumn ? rawRow[mapping.tagsColumn] : undefined,
 fields,
 };
}

module.exports = { buildMapping, applyMapping, AUTO };
