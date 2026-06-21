   'use strict';
   /** JSON-file storage for tickets, KB, history. PII masked on write. App runs if files missing. */
   const fs = require('fs');
   const path = require('path');
   const privacyGuard = require('./privacyGuard');
   const ROOT = process.cwd();
   const STORE_PATH = process.env.SUPPORT_HELPDESK_STORE_PATH || 'data/support-helpdesk.json';
   const KB_PATH = process.env.SUPPORT_HELPDESK_KB_PATH || 'data/support-kb.json';
   const HISTORY_PATH = process.env.SUPPORT_HELPDESK_HISTORY_PATH || 'data/support-helpdesk-history.json';
   const abs = (p) => path.isAbsolute(p) ? p : path.join(ROOT, p);
   function emptyState() { return { tickets: {}, version: 1 }; }
   function readJson(p, fb) { try { return JSON.parse(fs.readFileSync(abs(p), 'utf8')); } catch { return fb; } }
   function writeJson(p, d) { try { fs.mkdirSync(path.dirname(abs(p)), { recursive: true }); } catch {}
   fs.writeFileSync(abs(p), JSON.stringify(d, null, 2), 'utf8'); }
   function load() { return readJson(STORE_PATH, emptyState()); }
   function save(s) { writeJson(STORE_PATH, privacyGuard.maskDeep(s)); return load(); }
   function loadKb() { return readJson(KB_PATH, { articles: {} }); }
   function saveKb(k) { writeJson(KB_PATH, k); return loadKb(); }
   function appendHistory(e) { const h = readJson(HISTORY_PATH, []); h.push(Object.assign({ at: new Date().toISOString() },
   privacyGuard.maskDeep(e))); writeJson(HISTORY_PATH, h.slice(-2000)); }
   function readHistory(limit = 200) { return readJson(HISTORY_PATH, []).slice(-limit).reverse(); }
   module.exports = { emptyState, load, save, loadKb, saveKb, appendHistory, readHistory, paths: { STORE_PATH, KB_PATH,
   HISTORY_PATH } };
