 'use strict';
 /**
  * store.js — JSON-backed product store. Degrades to in-memory. No real customer
     * data, no secrets. Supplier masked at write time. Built to hold 5000+ products.
     */
 const fs = require('fs');
 const path = require('path');
 const redactor = require('./redactor');
 const FILE = path.join(process.cwd(), 'data', 'product-business-intelligence.json');


 let mem = null;
 function load() { if (mem) return mem; try { mem = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) { mem = {
 products: {} }; } if (!mem.products) mem.products = {}; return mem; }
 function persist() { try { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE,
 JSON.stringify(mem, null, 2)); return true; } catch (e) { return false; } }
 function all() { return Object.values(load().products); }
 function get(id) { return load().products[id] || null; }

 function put(p) { const d = load(); const safe = Object.assign({}, p, { supplierSafe: redactor.maskSupplier(p.supplier ||
 p.supplierSafe) }); delete safe.supplier; d.products[p.id] = safe; persist(); return d.products[p.id]; }
 function bulkPut(list) { (list || []).forEach(put); return all().length; }
 module.exports = { all, get, put, bulkPut, FILE };
