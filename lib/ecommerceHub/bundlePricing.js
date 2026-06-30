'use strict';

/**
 * Ecommerce Hub — bundle pricing.
 * Define a bundle of product ids with a bundle price (or % off the sum).
 * quote() computes savings vs buying separately. Persistent JSON.
 */

const fs = require('fs');
const path = require('path');
const productStore = require('./productStore');
function storePath() { const p = process.env.ECOMMERCE_HUB_BUNDLES_PATH || 'data/ecommerce-bundles.json'; return path.isAbsolute(p) ? p : path.join(process.cwd(), p); }
function empty() { return { version: 1, bundles: {}, updatedAt: null }; }
function ensureDir(file) { try { fs.mkdirSync(path.dirname(file), { recursive: true }); } catch (_e) {} }
function read() { try { const s = JSON.parse(fs.readFileSync(storePath(), 'utf8')); if (!s.bundles) s.bundles = {}; return s; } catch (_e) { return empty(); } }
function write(s) { try { s.updatedAt = new Date().toISOString(); ensureDir(storePath()); fs.writeFileSync(storePath(), JSON.stringify(s, null, 2), 'utf8'); return true; } catch (_e) { return false; } }
function create(rec) { const r = rec || {}; if (!r.name || !Array.isArray(r.productIds) || !r.productIds.length) return { ok: false, error: 'name_productIds_required' }; const s = read(); const id = r.id || ('bundle' + Date.now()); s.bundles[id] = { id: id, name: r.name, productIds: r.productIds.map(String), price: r.price != null ? Number(r.price) : null, percentOff: r.percentOff != null ? Number(r.percentOff) : null }; write(s); return { ok: true, bundle: s.bundles[id] }; }
function quote(id) { const b = read().bundles[id]; if (!b) return { ok: false, error: 'not_found' }; let sum = 0; const items = b.productIds.map(function (pid) { const p = productStore.findProduct(pid); if (p && p.price != null) sum += p.price; return p ? p.title : pid; }); let price = b.price != null ? b.price : (b.percentOff != null ? Math.round(sum * (1 - b.percentOff / 100)) : sum); return { ok: true, name: b.name, items: items, regular: sum, bundlePrice: price, savings: Math.max(0, sum - price) }; }
function list() { const b = read().bundles; return Object.keys(b).map(function (k) { return b[k]; }); }
module.exports = { create, quote, list };
