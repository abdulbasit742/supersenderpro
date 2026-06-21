 'use strict';
 /**
  * store.js — tiny JSON-backed store for marketing journeys. Read/write under
     * data/marketing-journeys.json (gitignored). Degrades to in-memory if the file
     * is unavailable. No secrets, no real customer data persisted.
  */
 const fs = require('fs');
 const path = require('path');
 const FILE = path.join(process.cwd(), 'data', 'marketing-journeys.json');


 let mem = null;

 function load() {
      if (mem) return mem;
      try { mem = JSON.parse(fs.readFileSync(FILE, 'utf8')); }
      catch (e) { mem = { journeys: {} }; }
      if (!mem.journeys) mem.journeys = {};
      return mem;
 }


 function persist() {
      try {
        fs.mkdirSync(path.dirname(FILE), { recursive: true });
       fs.writeFileSync(FILE, JSON.stringify(mem, null, 2));
       return true;
      } catch (e) { return false; } // in-memory only is acceptable in demo
 }

 function all() { const d = load(); return Object.values(d.journeys); }
 function get(id) { return load().journeys[id] || null; }
 function put(journey) { const d = load(); d.journeys[journey.id] = journey; persist(); return journey; }
 function remove(id) { const d = load(); delete d.journeys[id]; persist(); }

 module.exports = { all, get, put, remove, FILE };
