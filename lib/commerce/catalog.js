'use strict';
/**
 * catalog.js — Commerce Feature #1: the product catalog.
 *
 * The ecommerce side needs a real product list before carts/orders mean anything. This stores
 * products (price, stock, category, images), supports search/list, and decrements stock SAFELY
 * using the per-key stock mutex from PR #33 so two concurrent orders can't oversell the same item.
 *
 * Storage: JSON (data/catalog.json).
 */

const fs = require('fs');
const path = require('path');

let stockMutex = null;
try { stockMutex = require('../stockMutex'); } catch { stockMutex = null; }

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'catalog.json');

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { products: [] }; }
  catch { return { products: [] }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}
const nowIso = () => new Date().toISOString();
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

function createProduct(opts = {}) {
  if (!opts.name) throw new Error('product name required');
  const data = load();
  const p = {
    id: `PRD-${Date.now()}-${Math.random().toString(16).slice(2,6)}`,
    tenantId: opts.tenantId ? String(opts.tenantId) : null,
    name: opts.name,
    sku: opts.sku || '',
    price: round2(opts.price),
    currency: opts.currency || 'PKR',
    stock: Number.isFinite(opts.stock) ? Number(opts.stock) : 0,
    lowStockAt: Number(opts.lowStockAt || 5),
    category: opts.category || 'general',
    images: Array.isArray(opts.images) ? opts.images : [],
    description: opts.description || '',
    status: 'active',   // active | archived
    createdAt: nowIso()
  };
  data.products.push(p);
  save(data);
  return p;
}

function updateProduct(id, patch = {}) {
  const data = load();
  const p = data.products.find(x => x.id === id);
  if (!p) return null;
  for (const f of ['name', 'sku', 'category', 'description', 'status', 'currency']) if (patch[f] !== undefined) p[f] = patch[f];
  if (patch.price !== undefined) p.price = round2(patch.price);
  if (patch.stock !== undefined) p.stock = Number(patch.stock);
  if (patch.lowStockAt !== undefined) p.lowStockAt = Number(patch.lowStockAt);
  if (Array.isArray(patch.images)) p.images = patch.images;
  p.updatedAt = nowIso();
  save(data);
  return p;
}

function getProduct(id) { return load().products.find(p => p.id === id) || null; }

function listProducts(filter = {}) {
  let rows = load().products;
  if (filter.tenantId) rows = rows.filter(p => p.tenantId === String(filter.tenantId));
  if (filter.category) rows = rows.filter(p => p.category === filter.category);
  if (filter.status) rows = rows.filter(p => p.status === filter.status);
  else rows = rows.filter(p => p.status !== 'archived');
  if (filter.search) {
    const q = String(filter.search).toLowerCase();
    rows = rows.filter(p => p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q));
  }
  return rows;
}

function inStock(id, qty = 1) {
  const p = getProduct(id);
  return !!p && p.stock >= qty;
}

/**
 * Safely decrement stock for an order. Uses the per-key stock mutex so concurrent orders on the
 * same product serialise (no overselling). Returns { ok, stock } or { ok:false, reason }.
 */
async function decrementStock(id, qty = 1) {
  const run = async () => {
    const data = load();
    const p = data.products.find(x => x.id === id);
    if (!p) return { ok: false, reason: 'product not found' };
    if (p.stock < qty) return { ok: false, reason: 'insufficient stock', stock: p.stock };
    p.stock -= qty;
    p.updatedAt = nowIso();
    save(data);
    return { ok: true, stock: p.stock, lowStock: p.stock <= p.lowStockAt };
  };
  if (stockMutex && typeof stockMutex.runWithLock === 'function') {
    return stockMutex.runWithLock(`product:${id}`, run);
  }
  return run();
}

function lowStock(tenantId) {
  return listProducts({ tenantId }).filter(p => p.stock <= p.lowStockAt);
}

module.exports = { createProduct, updateProduct, getProduct, listProducts, inStock, decrementStock, lowStock };
