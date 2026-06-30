'use strict';
/**
 * lib/customers/csv.js - bulk customer import/export as CSV. Dependency-free parser/writer
 * (handles quoted fields + commas + escaped quotes) so it works without csv-parser.
 *
 * Import upserts by phone (tenant-scoped via lib/db), validates each row, and returns per-row
 * errors instead of failing the whole file. Export streams all customers as CSV text.
 */
const repo = require('../db');
const COLLECTION = 'customers';
const COLUMNS = ['phone', 'name', 'city', 'tier', 'tags', 'status', 'promoOptIn'];

// ---- minimal CSV parse (RFC-4180-ish) ----
function parseCSV(text) {
  const rows = [];
  let field = ''; let row = []; let inQuotes = false;
  const s = String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inQuotes) {
      if (ch === '"') { if (s[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; }
      else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else field += ch;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => String(c).trim() !== ''));
}

function toCSVValue(v) {
  const s = v === undefined || v === null ? '' : String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function rowsToObjects(rows) {
  if (!rows.length) return [];
  const header = rows[0].map((h) => String(h).trim());
  return rows.slice(1).map((r) => { const o = {}; header.forEach((h, i) => { o[h] = r[i] !== undefined ? String(r[i]).trim() : ''; }); return o; });
}

async function importCustomers(tenantId, csvText) {
  repo.assertTenant(tenantId);
  const objects = rowsToObjects(parseCSV(csvText));
  let created = 0; let updated = 0; const errors = [];
  for (let idx = 0; idx < objects.length; idx++) {
    const o = objects[idx];
    const phone = String(o.phone || '').trim();
    if (!phone) { errors.push({ row: idx + 2, error: 'missing phone' }); continue; }
    const data = {
      phone, name: o.name || '', city: o.city || '', tier: o.tier || 'Bronze',
      tags: o.tags ? String(o.tags).split(/[;|]/).map((t) => t.trim()).filter(Boolean) : [],
      status: o.status || 'active', promoOptIn: String(o.promoOptIn || 'true').toLowerCase() !== 'false',
    };
    try {
      const existing = (await repo.list(tenantId, COLLECTION, { phone }))[0];
      if (existing) { await repo.update(tenantId, COLLECTION, existing.id, data); updated++; }
      else { await repo.create(tenantId, COLLECTION, data); created++; }
    } catch (e) { errors.push({ row: idx + 2, error: e.message }); }
  }
  return { total: objects.length, created, updated, errors };
}

async function exportCustomers(tenantId) {
  repo.assertTenant(tenantId);
  const rows = await repo.list(tenantId, COLLECTION, {});
  const header = COLUMNS.join(',');
  const lines = rows.map((c) => COLUMNS.map((col) => {
    if (col === 'tags') return toCSVValue((c.tags || []).join(';'));
    return toCSVValue(c[col]);
  }).join(','));
  return [header, ...lines].join('\n') + '\n';
}

module.exports = { parseCSV, toCSVValue, rowsToObjects, importCustomers, exportCustomers, COLUMNS };
