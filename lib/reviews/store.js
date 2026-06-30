'use strict';
// #77 Reviews & Ratings — JSON-backed store, tenant-scoped.
const fs = require('fs');
const path = require('path');
const DATA_DIR = path.join(process.cwd(), 'data');
const FILE = path.join(DATA_DIR, 'reviews.json');

function ensure() {
  try { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_) {}
  if (!fs.existsSync(FILE)) { try { fs.writeFileSync(FILE, JSON.stringify({ reviews: [] }, null, 2)); } catch (_) {} }
}
function load() { ensure(); try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (_) { return { reviews: [] }; } }
function save(db) { ensure(); try { fs.writeFileSync(FILE, JSON.stringify(db, null, 2)); return true; } catch (_) { return false; } }
function list(db, tenantId, filter) {
  filter = filter || {};
  return db.reviews.filter(r =>
    (!tenantId || r.tenantId === (tenantId || 'default')) &&
    (!filter.productId || r.productId === filter.productId) &&
    (!filter.contactId || r.contactId === filter.contactId) &&
    (!filter.status || r.status === filter.status)
  );
}
module.exports = { load, save, list, FILE };
