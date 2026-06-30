'use strict';
/**
 * sheetsSync.js — Integrations Feature #1: Google Sheets two-way sync.
 *
 * Tons of small businesses run on Google Sheets. Meet them there: PULL rows from a sheet into
 * contacts (so their existing list becomes CRM contacts), and PUSH new orders/leads out to a sheet
 * tab (so their bookkeeping stays in the spreadsheet they trust).
 *
 * The actual Sheets API call is INJECTED (service-account client, or an Apps Script webhook URL),
 * so this module has no googleapis hard dependency and works with whatever the deploy wires up.
 * Sync config is stored per tenant in JSON (data/sheets_sync.json).
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'sheets_sync.json');

// Injected Sheets client:
//   readRows(sheetId, range) => Promise<string[][]>
//   appendRow(sheetId, tab, values[]) => Promise<void>
let client = { readRows: null, appendRow: null };
function setClient(c = {}) {
  if (typeof c.readRows === 'function') client.readRows = c.readRows;
  if (typeof c.appendRow === 'function') client.appendRow = c.appendRow;
}

// Injected contact upsert (Customer 360).
let upsertContact = null;
function setUpsert(fn) { upsertContact = typeof fn === 'function' ? fn : null; }

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { configs: {} }; }
  catch { return { configs: {} }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}
const nowIso = () => new Date().toISOString();
const normPhone = (v) => String(v || '').replace(/[^\d]/g, '');

/** Configure a tenant's sync. { tenantId, sheetId, contactsRange?, ordersTab?, mapping? } */
function configure(opts = {}) {
  if (!opts.tenantId || !opts.sheetId) throw new Error('tenantId and sheetId required');
  const data = load();
  data.configs[String(opts.tenantId)] = {
    sheetId: opts.sheetId,
    contactsRange: opts.contactsRange || 'Contacts!A:D',
    ordersTab: opts.ordersTab || 'Orders',
    mapping: opts.mapping || { name: 0, phone: 1, email: 2, tags: 3 },
    updatedAt: nowIso()
  };
  save(data);
  return data.configs[String(opts.tenantId)];
}
function getConfig(tenantId) { return load().configs[String(tenantId)] || null; }

/** Pull contacts from the sheet into the CRM. Returns import counts. */
async function pullContacts(tenantId) {
  const cfg = getConfig(tenantId);
  if (!cfg) throw new Error('no sync configured for tenant');
  if (!client.readRows) throw new Error('no Sheets read client wired');
  const rows = (await client.readRows(cfg.sheetId, cfg.contactsRange)) || [];
  const m = cfg.mapping;
  let imported = 0, skipped = 0;
  // assume row 0 is header
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const phone = normPhone(r[m.phone]);
    if (!phone) { skipped++; continue; }
    const contact = {
      phone,
      name: m.name != null ? (r[m.name] || '') : '',
      email: m.email != null ? (r[m.email] || '') : '',
      tags: m.tags != null && r[m.tags] ? String(r[m.tags]).split(/[;,|]/).map(t => t.trim()).filter(Boolean) : [],
      stage: 'lead', source: 'sheets'
    };
    try { if (upsertContact) upsertContact(contact); imported++; } catch { skipped++; }
  }
  return { imported, skipped, total: Math.max(0, rows.length - 1) };
}

/** Push an order (or any row) out to the orders tab. */
async function pushOrder(tenantId, order = {}) {
  const cfg = getConfig(tenantId);
  if (!cfg) throw new Error('no sync configured for tenant');
  if (!client.appendRow) throw new Error('no Sheets append client wired');
  const row = [
    order.id || '', order.phone || '', order.total != null ? String(order.total) : '',
    order.currency || '', order.status || '', order.createdAt || nowIso()
  ];
  await client.appendRow(cfg.sheetId, cfg.ordersTab, row);
  return { pushed: true, row };
}

module.exports = { setClient, setUpsert, configure, getConfig, pullContacts, pushOrder };
