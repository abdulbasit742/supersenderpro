'use strict';

/**
 * Ecommerce Hub — multi-store / branch registry.
 * Lets one account manage multiple stores/branches (e.g. different cities or
 * brands), each with a tag used to route orders/notifications. Persistent JSON.
 * Pure config; does not change platform behaviour, just labels + routing hints.
 */

const fs = require('fs');
const path = require('path');

function storePath() { const p = process.env.ECOMMERCE_HUB_STORES_PATH || 'data/ecommerce-stores.json'; return path.isAbsolute(p) ? p : path.join(process.cwd(), p); }
function empty() { return { version: 1, stores: {}, updatedAt: null }; }
function ensureDir(file) { try { fs.mkdirSync(path.dirname(file), { recursive: true }); } catch (_e) {} }
function read() { try { const s = JSON.parse(fs.readFileSync(storePath(), 'utf8')); if (!s.stores) s.stores = {}; return s; } catch (_e) { return empty(); } }
function write(s) { try { s.updatedAt = new Date().toISOString(); ensureDir(storePath()); fs.writeFileSync(storePath(), JSON.stringify(s, null, 2), 'utf8'); return true; } catch (_e) { return false; } }

function upsert(rec) {
  const r = rec || {}; if (!r.id) return { ok: false, error: 'id_required' };
  const s = read();
  s.stores[r.id] = Object.assign({ id: r.id, name: r.name || r.id, city: r.city || null, adminNumbers: r.adminNumbers || [], platform: r.platform || null }, s.stores[r.id] || {}, r);
  write(s);
  return { ok: true, store: s.stores[r.id] };
}
function get(id) { return read().stores[id] || null; }
function list() { const st = read().stores; return Object.keys(st).map(function (k) { return st[k]; }); }
function remove(id) { const s = read(); if (s.stores[id]) { delete s.stores[id]; write(s); return true; } return false; }

// route(city) -> store whose city matches, else null
function routeByCity(city) {
  const c = String(city || '').toLowerCase();
  return list().find(function (st) { return st.city && c.indexOf(String(st.city).toLowerCase()) !== -1; }) || null;
}

module.exports = { upsert, get, list, remove, routeByCity };
