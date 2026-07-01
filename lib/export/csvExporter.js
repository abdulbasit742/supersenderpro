'use strict';
/**
 * csvExporter.js — Export Feature #1: turn any dataset into a safe CSV download.
 *
 * Owners want their data out: contacts, leads, deals, invoices. This is a small, dependency-free
 * CSV engine plus a registry so each department can expose its rows under a name, and one endpoint
 * exports any of them.
 *
 * Safety: values are quoted per RFC-4180 AND guarded against CSV injection (a leading =,+,-,@ is
 * prefixed with a quote so spreadsheets don't execute it as a formula — a real attack vector when
 * user-supplied names/messages get exported).
 */

// dataset name -> () => rows[]
const datasets = {};
function register(name, provider) {
  if (typeof provider === 'function') datasets[name] = provider;
  return Object.keys(datasets);
}
function available() { return Object.keys(datasets); }

function getByPath(obj, pathStr) {
  return String(pathStr).split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function guardInjection(s) {
  // Prevent spreadsheet formula execution from exported user data.
  if (/^[=+\-@]/.test(s)) return `'${s}`;
  return s;
}

function cell(value) {
  if (value == null) return '';
  let s = typeof value === 'object' ? JSON.stringify(value) : String(value);
  s = guardInjection(s);
  if (/[",\n\r]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}

/**
 * Convert rows to CSV.
 * @param {Array<Object>} rows
 * @param {Array<string|{key,label}>} [columns]  explicit columns (dot-paths ok). If omitted, derived
 *   from the union of keys across the first rows.
 */
function toCsv(rows, columns) {
  rows = Array.isArray(rows) ? rows : [];
  let cols = columns;
  if (!cols || !cols.length) {
    const keys = new Set();
    for (const r of rows.slice(0, 50)) Object.keys(r || {}).forEach(k => keys.add(k));
    cols = [...keys];
  }
  const norm = cols.map(c => (typeof c === 'string' ? { key: c, label: c } : { key: c.key, label: c.label || c.key }));
  const header = norm.map(c => cell(c.label)).join(',');
  const lines = rows.map(r => norm.map(c => cell(getByPath(r, c.key))).join(','));
  return [header, ...lines].join('\r\n');
}

/** Export a registered dataset to CSV. Returns { filename, csv } or null if unknown. */
function exportDataset(name, opts = {}) {
  const provider = datasets[name];
  if (!provider) return null;
  const rows = provider(opts) || [];
  const csv = toCsv(rows, opts.columns);
  const stamp = new Date().toISOString().slice(0, 10);
  return { filename: `${name}_${stamp}.csv`, csv, rowCount: rows.length };
}

module.exports = { register, available, toCsv, exportDataset };
