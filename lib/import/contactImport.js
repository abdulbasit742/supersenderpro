'use strict';
/**
 * contactImport.js — Import Feature #1: bring contacts in from CSV.
 *
 * Onboarding hinges on this: a tenant arrives with a spreadsheet of contacts and needs them in the
 * system fast. This parses CSV (handling quotes/commas/newlines), maps columns to fields, validates
 * + normalises phones, dedupes, and upserts into Customer 360 via an injected sink. Returns a clear
 * per-row report so the user sees exactly what imported and what didn't.
 *
 * No external deps (own CSV parser). The upsert target is injected so it stays storage-agnostic.
 */

// Injected: (contact) => void  (e.g. customer360.upsertProfile(phone, fields))
let upsertContact = null;
function setUpsert(fn) { upsertContact = typeof fn === 'function' ? fn : null; }

// --- CSV parsing (RFC-4180-ish: quotes, escaped quotes, commas/newlines in quotes) ---
function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  const s = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(c => String(c).trim() !== ''));
}

const normPhone = (v) => String(v || '').replace(/[^\d]/g, '');
function isValidPhone(p) { return p.length >= 7 && p.length <= 15; }
function isValidEmail(e) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(e || '')); }

/**
 * Auto-detect column mapping from header names. Returns { name, phone, email, tags } -> column index.
 */
function autoMap(header) {
  const map = {};
  header.forEach((h, i) => {
    const k = String(h || '').trim().toLowerCase();
    if (/(phone|mobile|number|whatsapp|contact)/.test(k) && map.phone === undefined) map.phone = i;
    else if (/(name|full ?name|customer)/.test(k) && map.name === undefined) map.name = i;
    else if (/(email|e-mail)/.test(k) && map.email === undefined) map.email = i;
    else if (/(tag|group|segment|label)/.test(k) && map.tags === undefined) map.tags = i;
  });
  return map;
}

/**
 * Import contacts from CSV text.
 * @param {string} csvText
 * @param {Object} opts { mapping?, hasHeader?=true, defaultTags?:string[] }
 * @returns {Object} { imported, skipped, errors:[{row, reason}], total }
 */
function importCSV(csvText, opts = {}) {
  const rows = parseCSV(csvText);
  if (!rows.length) return { imported: 0, skipped: 0, errors: [], total: 0 };

  const hasHeader = opts.hasHeader !== false;
  const header = hasHeader ? rows[0] : [];
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const mapping = opts.mapping || (hasHeader ? autoMap(header) : { phone: 0, name: 1 });
  if (mapping.phone === undefined) {
    return { imported: 0, skipped: dataRows.length, errors: [{ row: 0, reason: 'no phone column detected' }], total: dataRows.length };
  }

  const seen = new Set();
  let imported = 0, skipped = 0;
  const errors = [];

  dataRows.forEach((r, idx) => {
    const rowNum = idx + (hasHeader ? 2 : 1);
    const phone = normPhone(r[mapping.phone]);
    if (!isValidPhone(phone)) { skipped++; errors.push({ row: rowNum, reason: 'invalid/missing phone' }); return; }
    if (seen.has(phone)) { skipped++; errors.push({ row: rowNum, reason: 'duplicate in file' }); return; }
    seen.add(phone);

    const email = mapping.email !== undefined ? String(r[mapping.email] || '').trim() : '';
    if (email && !isValidEmail(email)) { /* keep contact, drop bad email */ }
    const tagsRaw = mapping.tags !== undefined ? String(r[mapping.tags] || '') : '';
    const tags = [...new Set([...(opts.defaultTags || []), ...tagsRaw.split(/[;,|]/).map(t => t.trim()).filter(Boolean)])];

    const contact = {
      phone,
      name: mapping.name !== undefined ? String(r[mapping.name] || '').trim() : '',
      email: email && isValidEmail(email) ? email : '',
      tags,
      stage: 'lead',
      source: 'import'
    };

    try {
      if (upsertContact) upsertContact(contact);
      imported++;
    } catch (e) {
      skipped++; errors.push({ row: rowNum, reason: e.message });
    }
  });

  return { imported, skipped, errors: errors.slice(0, 200), total: dataRows.length, mappingUsed: mapping };
}

/** Preview mapping + first few rows without importing. */
function preview(csvText, opts = {}) {
  const rows = parseCSV(csvText);
  const hasHeader = opts.hasHeader !== false;
  const header = hasHeader ? rows[0] : [];
  return {
    header,
    detectedMapping: hasHeader ? autoMap(header) : { phone: 0, name: 1 },
    sampleRows: (hasHeader ? rows.slice(1, 6) : rows.slice(0, 5)),
    totalRows: hasHeader ? rows.length - 1 : rows.length
  };
}

module.exports = { setUpsert, parseCSV, autoMap, importCSV, preview };
