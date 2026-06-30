'use strict';

/**
 * Ecommerce Hub — product/client cache (Phase 1).
 * Caches normalized (already-masked) product/client snapshots to a JSON file
 * so the dashboard + WhatsApp commands are fast and work offline. No raw PII.
 */

const fs = require('fs');
const path = require('path');

function storePath() {
  const p = process.env.ECOMMERCE_HUB_STORE_PATH || 'data/ecommerce-hub.json';
  return path.isAbsolute(p) ? p : path.join(process.cwd(), p);
}
function emptyState() { return { version: 1, products: [], clients: [], updatedAt: null }; }
function ensureDir(file) { try { fs.mkdirSync(path.dirname(file), { recursive: true }); } catch (_e) {} }

function read() {
  try {
    const s = JSON.parse(fs.readFileSync(storePath(), 'utf8'));
    if (!Array.isArray(s.products)) s.products = [];
    if (!Array.isArray(s.clients)) s.clients = [];
    return s;
  } catch (_e) { return emptyState(); }
}
function write(state) {
  try {
    state.updatedAt = new Date().toISOString();
    ensureDir(storePath());
    fs.writeFileSync(storePath(), JSON.stringify(state, null, 2), 'utf8');
    return true;
  } catch (_e) { return false; }
}

function saveProducts(products) { const s = read(); s.products = products || []; write(s); return s.products.length; }
function saveClients(clients) { const s = read(); s.clients = clients || []; write(s); return s.clients.length; }
function getProducts() { return read().products; }
function getClients() { return read().clients; }
function findProduct(id) {
  const want = String(id || '').toLowerCase();
  return read().products.find(function (p) { return String(p.id).toLowerCase() === want; }) || null;
}
function status() {
  const s = read();
  return { storePath: process.env.ECOMMERCE_HUB_STORE_PATH || 'data/ecommerce-hub.json', products: s.products.length, clients: s.clients.length, updatedAt: s.updatedAt };
}

module.exports = { saveProducts, saveClients, getProducts, getClients, findProduct, status };
