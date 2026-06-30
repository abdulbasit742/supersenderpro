'use strict';
// #80 Abandoned Cart Recovery — JSON-backed store, tenant-scoped.
const fs = require('fs');
const path = require('path');
const DATA_DIR = path.join(process.cwd(), 'data');
const FILE = path.join(DATA_DIR, 'cart-recovery.json');

function ensure() {
  try { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_) {}
  if (!fs.existsSync(FILE)) { try { fs.writeFileSync(FILE, JSON.stringify({ carts: {} }, null, 2)); } catch (_) {} }
}
function load() { ensure(); try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (_) { return { carts: {} }; } }
function save(db) { ensure(); try { fs.writeFileSync(FILE, JSON.stringify(db, null, 2)); return true; } catch (_) { return false; } }
function key(tenantId, cartId) { return `${tenantId || 'default'}:${cartId}`; }
function get(db, tenantId, cartId) { return db.carts[key(tenantId, cartId)] || null; }
function list(db, tenantId, status) {
  return Object.values(db.carts).filter(c => (!tenantId || c.tenantId === (tenantId || 'default')) && (!status || c.status === status));
}
module.exports = { load, save, get, list, key, FILE };
