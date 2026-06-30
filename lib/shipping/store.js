'use strict';
// #58 Shipping — atomic JSON store (tmp + rename), tenant-scoped envelope.
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data');
const FILE = path.join(DATA_DIR, 'shipping.json');

function ensureDir() {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_) {}
}

function emptyDb() {
  return { version: 1, tenants: {} };
}

function readDb() {
  try {
    const raw = fs.readFileSync(FILE, 'utf8');
    const db = JSON.parse(raw);
    if (!db || typeof db !== 'object') return emptyDb();
    if (!db.tenants) db.tenants = {};
    return db;
  } catch (_) {
    return emptyDb();
  }
}

function writeDb(db) {
  ensureDir();
  const tmp = FILE + '.' + process.pid + '.' + Date.now() + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, FILE);
  return true;
}

function tenantBucket(db, tenantId) {
  if (!tenantId) throw new Error('shipping: tenantId required');
  if (!db.tenants[tenantId]) db.tenants[tenantId] = { shipments: [] };
  if (!db.tenants[tenantId].shipments) db.tenants[tenantId].shipments = [];
  return db.tenants[tenantId];
}

module.exports = { readDb, writeDb, tenantBucket, FILE };
