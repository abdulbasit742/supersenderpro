'use strict';

/**
 * Ecommerce Hub — opt-out + contact store (shared).
 * Tracks buyers who said STOP/UNSUB (never message them again) and a light
 * contact list (phone -> name/platform/lastOrderAt) used for broadcast + reorder.
 * Compliance-first: opt-out is checked before ANY marketing send.
 */

const fs = require('fs');
const path = require('path');

function storePath() {
  const p = process.env.ECOMMERCE_HUB_CONTACTS_PATH || 'data/ecommerce-contacts.json';
  return path.isAbsolute(p) ? p : path.join(process.cwd(), p);
}
function empty() { return { version: 1, optOut: {}, contacts: {}, updatedAt: null }; }
function ensureDir(file) { try { fs.mkdirSync(path.dirname(file), { recursive: true }); } catch (_e) {} }
function read() { try { const s = JSON.parse(fs.readFileSync(storePath(), 'utf8')); if (!s.optOut) s.optOut = {}; if (!s.contacts) s.contacts = {}; return s; } catch (_e) { return empty(); } }
function write(s) { try { s.updatedAt = new Date().toISOString(); ensureDir(storePath()); fs.writeFileSync(storePath(), JSON.stringify(s, null, 2), 'utf8'); return true; } catch (_e) { return false; } }
function normNum(v) { return String(v || '').replace(/[^0-9]/g, ''); }

function optOut(phone) { const k = normNum(phone); if (!k) return false; const s = read(); s.optOut[k] = Date.now(); return write(s); }
function isOptedOut(phone) { const k = normNum(phone); return k ? !!read().optOut[k] : false; }
function upsertContact(phone, rec) {
  const k = normNum(phone); if (!k) return false;
  const s = read(); s.contacts[k] = Object.assign({ phone: k }, s.contacts[k] || {}, rec || {}); return write(s);
}
function listContacts(filter) {
  const s = read();
  return Object.keys(s.contacts).map(function (k) { return s.contacts[k]; })
    .filter(function (c) {
      if (s.optOut[c.phone]) return false;
      if (filter && filter.platform && String(c.platform) !== String(filter.platform)) return false;
      return true;
    });
}

module.exports = { optOut, isOptedOut, upsertContact, listContacts, normNum };
