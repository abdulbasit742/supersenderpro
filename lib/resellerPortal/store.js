   'use strict';
   /** JSON-file storage for resellers, referrals, history. PII masked on write. App runs if files missing. */
   const fs = require('fs');
   const path = require('path');
   const privacyGuard = require('./privacyGuard');
   const ROOT = process.cwd();
   const STORE_PATH = process.env.RESELLER_PORTAL_STORE_PATH || 'data/reseller-portal.json';
   const REFERRALS_PATH = process.env.RESELLER_PORTAL_REFERRALS_PATH || 'data/reseller-referrals.json';
   const HISTORY_PATH = process.env.RESELLER_PORTAL_HISTORY_PATH || 'data/reseller-portal-history.json';
   const abs = (p) => path.isAbsolute(p) ? p : path.join(ROOT, p);
   function emptyState() { return { resellers: {}, branding: {}, version: 1 }; }
   function readJson(p, fb) { try { return JSON.parse(fs.readFileSync(abs(p), 'utf8')); } catch { return fb; } }
   function writeJson(p, d) { try { fs.mkdirSync(path.dirname(abs(p)), { recursive: true }); } catch {}
   fs.writeFileSync(abs(p), JSON.stringify(d, null, 2), 'utf8'); }
   function load() { return readJson(STORE_PATH, emptyState()); }
   function save(s) { writeJson(STORE_PATH, privacyGuard.maskDeep(s)); return load(); }
   function loadReferrals() { return readJson(REFERRALS_PATH, []); }
   function saveReferrals(r) { writeJson(REFERRALS_PATH, privacyGuard.maskDeep(r)); }
   function appendHistory(e) { const h = readJson(HISTORY_PATH, []); h.push(Object.assign({ at: new Date().toISOString() },
   privacyGuard.maskDeep(e))); writeJson(HISTORY_PATH, h.slice(-2000)); }
   function readHistory(limit = 200) { return readJson(HISTORY_PATH, []).slice(-limit).reverse(); }
   module.exports = { emptyState, load, save, loadReferrals, saveReferrals, appendHistory, readHistory, paths: { STORE_PATH,
   REFERRALS_PATH, HISTORY_PATH } };
