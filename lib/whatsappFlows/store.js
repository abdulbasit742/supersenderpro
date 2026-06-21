 'use strict';
 /**
  * store.js — JSON-backed flow store. Degrades to in-memory. No real customer
     * data, no secrets persisted. Flow definitions only (responses live separately).
     */
 const fs = require('fs');
 const path = require('path');
 const FILE = path.join(process.cwd(), 'data', 'whatsapp-flows.json');


 let mem = null;
 function load() { if (mem) return mem; try { mem = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) { mem = {
 flows: {} }; } if (!mem.flows) mem.flows = {}; return mem; }
 function persist() { try { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE,
 JSON.stringify(mem, null, 2)); return true; } catch (e) { return false; } }
 function all() { return Object.values(load().flows); }
 function get(id) { return load().flows[id] || null; }
 function put(f) { const d = load(); d.flows[f.id] = f; persist(); return f; }
 function bulkPut(list) { (list || []).forEach(put); return all().length; }
 module.exports = { all, get, put, bulkPut, FILE };
