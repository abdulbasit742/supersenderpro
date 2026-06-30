'use strict';
// #71 Loyalty & Points — JSON-backed store. Tenant-scoped, no external deps.
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data');
const FILE = path.join(DATA_DIR, 'loyalty.json');

function ensure() {
  try { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_) {}
  if (!fs.existsSync(FILE)) {
    try { fs.writeFileSync(FILE, JSON.stringify({ accounts: {}, ledger: [] }, null, 2)); } catch (_) {}
  }
}

function load() {
  ensure();
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); }
  catch (_) { return { accounts: {}, ledger: [] }; }
}

function save(db) {
  ensure();
  try { fs.writeFileSync(FILE, JSON.stringify(db, null, 2)); return true; }
  catch (_) { return false; }
}

function key(tenantId, contactId) { return `${tenantId || 'default'}:${contactId}`; }

function getAccount(db, tenantId, contactId) {
  const k = key(tenantId, contactId);
  if (!db.accounts[k]) {
    db.accounts[k] = { tenantId: tenantId || 'default', contactId, balance: 0, lifetimeEarned: 0, lifetimeRedeemed: 0, tier: 'bronze', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  }
  return db.accounts[k];
}

function listAccounts(db, tenantId) {
  return Object.values(db.accounts).filter(a => !tenantId || a.tenantId === (tenantId || 'default'));
}

function listLedger(db, tenantId, contactId) {
  return db.ledger.filter(e => (!tenantId || e.tenantId === (tenantId || 'default')) && (!contactId || e.contactId === contactId));
}

module.exports = { load, save, getAccount, listAccounts, listLedger, key, FILE };
