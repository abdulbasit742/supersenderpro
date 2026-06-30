'use strict';
/**
 * dataExport.js — Export Feature #1: CSV exports for the owner.
 *
 * Founders and their accountants need data OUT — contacts, leads, deals, invoices — as CSV for
 * spreadsheets, taxes, or migrating. This builds clean, safe CSV from whatever the other modules
 * already hold (data is pulled via injected providers, so this stays storage-agnostic).
 *
 * Safety: values are quoted/escaped properly, and we guard against CSV injection (a leading =,+,-,@
 * is prefixed so spreadsheets don't execute it as a formula).
 */

const providers = {
  contacts: null,  // () => [{...}]
  leads: null,     // () => [{...}]
  deals: null,     // () => [{...}]
  invoices: null   // () => [{...}]
};
function configure(p = {}) {
  for (const k of Object.keys(providers)) if (typeof p[k] === 'function') providers[k] = p[k];
  return Object.keys(providers).filter(k => providers[k]);
}

function sanitizeCell(v) {
  if (v == null) return '';
  let s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  // CSV injection guard
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  // quote if it contains comma, quote, or newline
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * Convert rows -> CSV. `columns` is [{ key, label }] (label optional). If omitted, uses keys of the
 * first row.
 */
function toCSV(rows, columns) {
  rows = Array.isArray(rows) ? rows : [];
  const cols = columns && columns.length
    ? columns
    : (rows[0] ? Object.keys(rows[0]).map(k => ({ key: k, label: k })) : []);
  const header = cols.map(c => sanitizeCell(c.label || c.key)).join(',');
  const lines = rows.map(r => cols.map(c => sanitizeCell(getPath(r, c.key))).join(','));
  return [header, ...lines].join('\r\n');
}

function getPath(obj, key) {
  if (!key.includes('.')) return obj[key];
  return key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

const SCHEMAS = {
  contacts: [
    { key: 'phone', label: 'Phone' }, { key: 'name', label: 'Name' }, { key: 'email', label: 'Email' },
    { key: 'stage', label: 'Stage' }, { key: 'stats.totalSpent', label: 'Total Spent' },
    { key: 'stats.orderCount', label: 'Orders' }, { key: 'stats.lastOrderAt', label: 'Last Order' }
  ],
  leads: [
    { key: 'name', label: 'Name' }, { key: 'phone', label: 'Phone' }, { key: 'email', label: 'Email' },
    { key: 'source', label: 'Source' }, { key: 'status', label: 'Status' }, { key: 'createdAt', label: 'Created' }
  ],
  deals: [
    { key: 'title', label: 'Title' }, { key: 'customerPhone', label: 'Customer' }, { key: 'value', label: 'Value' },
    { key: 'stage', label: 'Stage' }, { key: 'status', label: 'Status' }, { key: 'expectedCloseAt', label: 'Expected Close' }
  ],
  invoices: [
    { key: 'number', label: 'Invoice #' }, { key: 'customer.name', label: 'Customer' }, { key: 'total', label: 'Total' },
    { key: 'currency', label: 'Currency' }, { key: 'status', label: 'Status' }, { key: 'issuedAt', label: 'Issued' }, { key: 'paidAt', label: 'Paid' }
  ]
};

/**
 * Export one dataset by name. Returns { filename, csv } or null if no provider.
 */
function exportDataset(name) {
  const provider = providers[name];
  if (!provider) return null;
  const rows = provider() || [];
  const csv = toCSV(rows, SCHEMAS[name]);
  const date = new Date().toISOString().slice(0, 10);
  return { filename: `${name}_${date}.csv`, csv, count: rows.length };
}

function available() { return Object.keys(providers).filter(k => providers[k]); }

module.exports = { configure, toCSV, exportDataset, available, SCHEMAS };
