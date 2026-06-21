 'use strict';
 /**
  * store.js — JSON-backed store for portal preview sessions/customers. Stores ONLY
     * masked, demo-safe identifiers (preview tokens), never raw PII or auth secrets.
     * Degrades to in-memory.
  */
 const fs = require('fs');
 const path = require('path');
 const FILE = path.join(process.cwd(), 'data', 'customer-portal.json');

 let mem = null;

 function load() { if (mem) return mem; try { mem = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) { mem = {
 customers: {} }; } if (!mem.customers) mem.customers = {}; return mem; }
 function persist() { try { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE,
 JSON.stringify(mem, null, 2)); return true; } catch (e) { return false; } }
 function all() { return Object.values(load().customers); }
 function get(previewToken) { return load().customers[previewToken] || null; }
 function put(c) { const d = load(); d.customers[c.previewToken] = c; persist(); return c; }
 function bulkPut(list) { (list || []).forEach(put); return all().length; }
 module.exports = { all, get, put, bulkPut, FILE };
