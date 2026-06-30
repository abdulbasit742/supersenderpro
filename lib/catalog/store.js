'use strict';
// #83 Product Catalog & Variants — JSON-backed store, tenant-scoped.
const fs = require('fs');
const path = require('path');
const DATA_DIR = path.join(process.cwd(), 'data');
const FILE = path.join(DATA_DIR, 'catalog.json');

function ensure() {
  try { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_) {}
  if (!fs.existsSync(FILE)) { try { fs.writeFileSync(FILE, JSON.stringify({ products: {} }, null, 2)); } catch (_) {} }
}
function load() { ensure(); try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (_) { return { products: {} }; } }
function save(db) { ensure(); try { fs.writeFileSync(FILE, JSON.stringify(db, null, 2)); return true; } catch (_) { return false; } }
function key(tenantId, productId) { return `${tenantId || 'default'}:${productId}`; }
function get(db, tenantId, productId) { return db.products[key(tenantId, productId)] || null; }
function list(db, tenantId) { return Object.values(db.products).filter(p => !tenantId || p.tenantId === (tenantId || 'default')); }
module.exports = { load, save, get, list, key, FILE };
