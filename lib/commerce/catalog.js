'use strict';
/**
 * catalog.js — Commerce Feature #1: the product catalog.
 *
 * Selling on WhatsApp needs products: name, price, stock, image. This is the catalog — CRUD,
 * categories, search, low-stock flags, mutex-safe stock decrement on order, and a toWhatsApp()
 * helper that formats a clean product card to send in chat. It's the base the order/cart features
 * build on.
 *
 * Stock changes go through the existing stockMutex (PR #33) so concurrent orders can't oversell.
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
  const product = {
    id: `PROD-${Date.now()}-${Math.random().toString(16).slice(2,6)}`,
    name: opts.name,
    sku: opts.sku || '',
    price: round2(opts.price || 0),
    currency: opts.currency || 'PKR',
    stock: Number.isFinite(opts.stock) ? Number(opts.stock) : (opts.stock == null ? null : Number(opts.stock)),
    category: opts.category || 'general',
    description: opts.description || '',
    imageUrl: opts.imageUrl || null,
    active: opts.active !== false,
    lowStockAt: Number(opts.lowStockAt || 5),
    createdAt: nowIso()
  };
  data.products.push(product);
  save(data);
  return product;
}

function updateProduct(id, patch = {}) {
  const data = load();
  const p = data.products.find(x => x.id === id);
  if (!p) return null;
  for (const f of ['name', 'sku', 'category', 'description', 'imageUrl', 'active', 'currency']) {
    if (patch[f] !== undefined) p[f] = patch[f];
  }
  if (patch.price !== undefined) p.price = round2(patch.price);
  if (patch.stock !== undefined) p.stock = patch.stock == null ? null : Number(patch.stock);
  if (patch.lowStockAt !== undefined) p.lowStockAt = Number(patch.lowStockAt);
  p.updatedAt = nowIso();
  save(data);
  return p;
}

function deleteProduct(id) {
  const data = load();
  const before = data.products.length;
  data.products = data.products.filter(p => p.id !== id);
  save(data);
  return { deleted: before - data.products.length };
}

function getProduct(id) { return load().products.find(p => p.id === id) || null; }

function listProducts(filter = {}) {
  let rows = load().products;
  if (filter.category) rows = rows.filter(p => p.category === filter.category);
  if (filter.activeOnly) rows = rows.filter(p => p.active);
  if (filter.search) {
    const q = String(filter.search).toLowerCase();
    rows = rows.filter(p => p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q));
  }
  if (filter.lowStock) rows = rows.filter(p => p.stock != null && p.stock <= p.lowStockAt);
  return rows;
}

/**
 * Decrement stock for an order, mutex-safe (per-product lock). Returns { ok, product } or throws if
 * insufficient stock. Products with null stock are treated as unlimited.
 */
async function decrementStock(id, qty = 1) {
  const run = async () => {
    const data = load();
    const p = data.products.find(x => x.id === id);
    if (!p) throw new Error('product not found');
    if (p.stock == null) return { ok: true, product: p }; // unlimited
    if (p.stock < qty) throw new Error(`insufficient stock: ${p.stock} left`);
    p.stock -= qty;
    p.updatedAt = nowIso();
    save(data);
    return { ok: true, product: p, lowStock: p.stock <= p.lowStockAt };
  };
  // serialise per-product so concurrent orders can't oversell
  if (stockMutex && typeof stockMutex.runWithLock === 'function') return stockMutex.runWithLock(`product:${id}`, run);
  return run();
}

/** Format a product as a WhatsApp-friendly card. */
function toWhatsApp(id) {
  const p = getProduct(id);
  if (!p) return null;
  const lines = [
    `*${p.name}*`,
    p.description ? p.description : null,
    `💰 ${p.currency} ${p.price}`,
    (p.stock != null ? (p.stock > 0 ? `✅ In stock` : `❌ Out of stock`) : null)
  ].filter(Boolean);
  return { text: lines.join('\n'), imageUrl: p.imageUrl };
}

module.exports = { createProduct, updateProduct, deleteProduct, getProduct, listProducts, decrementStock, toWhatsApp };
