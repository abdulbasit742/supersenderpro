 'use strict';


 /**
     * Dealer Portal store. Local JSON persistence under data/, preview state only.
     * Never writes to any business ledger. Defensive: a missing/corrupt file
     * degrades to an empty store, never crashes the server.
     */

 const fs = require('fs');
 const path = require('path');

 const DATA_DIR = path.join(process.cwd(), 'data');
 const FILE = path.join(DATA_DIR, 'dealer-portal-preview.json');

 function ensureDir() {
      try { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); }
      catch (e) { /* read-only fs is fine for previews */ }
 }


 function readAll() {
   try {
          if (!fs.existsSync(FILE)) return { dealers: {}, sessions: {}, previews: {} };
          const raw = fs.readFileSync(FILE, 'utf8');
          const parsed = JSON.parse(raw);
          return parsed && typeof parsed === 'object'
           ? Object.assign({ dealers: {}, sessions: {}, previews: {} }, parsed)
           : { dealers: {}, sessions: {}, previews: {} };
      } catch (e) {
        return { dealers: {}, sessions: {}, previews: {} };
      }
 }

 function writeAll(state) {
      // Preview-only persistence. Guarded so a deploy with no writable data/ dir
      // never takes the portal down.
      try {
        ensureDir();
          fs.writeFileSync(FILE, JSON.stringify(state || {}, null, 2), 'utf8');
          return { ok: true, persisted: true };
      } catch (e) {
        return { ok: true, persisted: false, warning: 'store_not_writable' };
      }
 }

 function getDealer(dealerId) {
      const all = readAll();
      return all.dealers[String(dealerId)] || null;
 }


 function upsertDealerPreview(dealerId, patch) {
   const all = readAll();
      const id = String(dealerId);
      all.dealers[id] = Object.assign({ id }, all.dealers[id] || {}, patch || {}, {
        updatedAtPreview: new Date().toISOString(),
      });
      const res = writeAll(all);
      return { dealer: all.dealers[id], persisted: res.persisted };
 }


 module.exports = { FILE, readAll, writeAll, getDealer, upsertDealerPreview };
