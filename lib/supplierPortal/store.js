 'use strict';
 /**
  * store.js — JSON-backed store for vendor portal preview suppliers. Stores ONLY
  * masked, demo-safe identifiers (preview tokens). Never raw bank/tax/payment PII.
  */
 const fs = require('fs');
 const path = require('path');
 const FILE = path.join(process.cwd(), 'data', 'supplier-portal.json');

 let mem = null;
 function load() { if (mem) return mem; try { mem = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) { mem = {
 suppliers: {} }; } if (!mem.suppliers) mem.suppliers = {}; return mem; }
 function persist() { try { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE,
 JSON.stringify(mem, null, 2)); return true; } catch (e) { return false; } }
 function all() { return Object.values(load().suppliers); }
 function get(token) { return load().suppliers[token] || null; }
 function put(s) { const d = load(); d.suppliers[s.previewToken] = s; persist(); return s; }
 function bulkPut(list) { (list || []).forEach(put); return all().length; }
 module.exports = { all, get, put, bulkPut, FILE };
