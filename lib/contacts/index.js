'use strict';
/**
 * lib/contacts/index.js - Contacts CRM + dynamic audience Segmentation.
 *
 * The targeting layer that makes broadcasts actually convert (and that Wati/AiSensy/Interakt
 * gate behind paid tiers): tenant-scoped contacts with custom attributes + tags + opt-in/out,
 * CSV/bulk import, and rule-based dynamic segments that resolve live to a recipient list.
 *
 * No sending here - segments produce recipient lists the broadcast engine consumes.
 * Wire the API with: node scripts/wire-contacts.js
 */
const config = require('./config');
const store = require('./store');
const contacts = require('./contacts');
const segments = require('./segments');

/** Parse a simple CSV (header row, comma-separated) into contact rows.
 *  Recognizes columns: phone, name, tags (semicolon-separated). Any other column -> attribute. */
function parseCSV(text) {
  const lines = String(text || '').split(/\r?\n/).filter((l) => l.trim() !== '');
  if (!lines.length) return [];
  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(',');
    const row = { attributes: {} };
    headers.forEach((h, i) => {
      const val = (cells[i] || '').trim();
      const key = h.toLowerCase();
      if (key === 'phone') row.phone = val;
      else if (key === 'name') row.name = val;
      else if (key === 'tags') row.tags = val ? val.split(';').map((t) => t.trim()).filter(Boolean) : [];
      else if (val !== '') row.attributes[h] = val;
    });
    return row;
  });
}

function importCSV(tid, text) {
  return contacts.importMany(tid, parseCSV(text));
}

module.exports = {
  config: config.config,
  paths: config.paths,
  operators: config.operators,
  store, contacts, segments,
  parseCSV, importCSV,
  doctor: require('./doctor'),
};
