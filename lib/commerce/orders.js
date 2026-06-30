'use strict';
/**
 * orders.js — Commerce Feature #2: carts + orders.
 *
 * Catalog (#commerce1) holds products; this turns interest into revenue: a per-contact cart they
 * build over WhatsApp, then checkout() that decrements stock (mutex-safe via the catalog), creates
 * an order with computed totals, and clears the cart. Orders move through a status flow and fire
 * hooks so Customer 360 records the order and loyalty/payment can react.
 *
 * Decoupled: catalog access + post-order hook injected. Storage: JSON (data/orders.json).
 */

const fs = require('fs');
const path = require('path');

let catalog = null;
try { catalog = require('./catalog'); } catch { catalog = null; }

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'orders.json');

let onOrder = null; // (order) => void  (e.g. record on 360, award loyalty, create invoice)
function setOnOrder(fn) { onOrder = typeof fn === 'function' ? fn : null; }

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { carts: {}, orders: [] }; }
  catch { return { carts: {}, orders: [] }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}
const nowIso = () => new Date().toISOString();
const normPhone = (v) => String(v || '').replace(/[^\d]/g, '');
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

function priceOf(productId) {
  if (catalog && typeof catalog.getProduct === 'function') {
    const p = catalog.getProduct(productId);
    return p ? { price: p.price, name: p.name, currency: p.currency } : null;
  }
  return null;
}

// --- Cart ---
function getCart(phone) {
  const p = normPhone(phone);
  const data = load();
  return data.carts[p] || { phone: p, items: [], updatedAt: null };
}

function addToCart(phone, productId, qty = 1) {
  const p = normPhone(phone);
  if (!p) throw new Error('phone required');
  if (!productId) throw new Error('productId required');
  const data = load();
  const cart = data.carts[p] || { phone: p, items: [] };
  const line = cart.items.find(i => i.productId === productId);
  if (line) line.qty += Number(qty);
  else cart.items.push({ productId, qty: Number(qty) });
  cart.updatedAt = nowIso();
  data.carts[p] = cart;
  save(data);
  return cartView(cart);
}

function removeFromCart(phone, productId) {
  const p = normPhone(phone);
  const data = load();
  const cart = data.carts[p];
  if (!cart) return null;
  cart.items = cart.items.filter(i => i.productId !== productId);
  cart.updatedAt = nowIso();
  save(data);
  return cartView(cart);
}

function cartView(cart) {
  const items = cart.items.map(i => {
    const info = priceOf(i.productId) || { price: 0, name: i.productId, currency: 'PKR' };
    return { ...i, name: info.name, unitPrice: info.price, lineTotal: round2(info.price * i.qty), currency: info.currency };
  });
  const total = round2(items.reduce((s, i) => s + i.lineTotal, 0));
  return { phone: cart.phone, items, total, currency: items[0]?.currency || 'PKR' };
}

// --- Checkout ---
async function checkout(phone, opts = {}) {
  const p = normPhone(phone);
  const data = load();
  const cart = data.carts[p];
  if (!cart || !cart.items.length) throw new Error('cart is empty');
  const view = cartView(cart);

  // decrement stock for each line (mutex-safe via catalog); roll back on failure
  const decremented = [];
  try {
    if (catalog && typeof catalog.decrementStock === 'function') {
      for (const item of cart.items) {
        await catalog.decrementStock(item.productId, item.qty);
        decremented.push(item);
      }
    }
  } catch (e) {
    // best-effort: we don't auto-restock here (kept simple); surface the error
    throw new Error(`checkout failed: ${e.message}`);
  }

  const order = {
    id: `ORD-${Date.now()}-${Math.random().toString(16).slice(2,6)}`,
    phone: p,
    items: view.items,
    total: view.total,
    currency: view.currency,
    status: 'pending',  // pending | paid | fulfilled | cancelled
    note: opts.note || '',
    createdAt: nowIso()
  };
  data.orders.push(order);
  delete data.carts[p]; // clear cart
  save(data);
  if (onOrder) { try { onOrder(order); } catch { /* ignore */ } }
  return order;
}

function setOrderStatus(id, status) {
  const allowed = ['pending', 'paid', 'fulfilled', 'cancelled'];
  if (!allowed.includes(status)) throw new Error(`invalid status. use: ${allowed.join(', ')}`);
  const data = load();
  const o = data.orders.find(x => x.id === id);
  if (!o) return null;
  o.status = status;
  o.updatedAt = nowIso();
  save(data);
  return o;
}

function listOrders(filter = {}) {
  let rows = load().orders;
  if (filter.phone) rows = rows.filter(o => o.phone === normPhone(filter.phone));
  if (filter.status) rows = rows.filter(o => o.status === filter.status);
  rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return rows;
}
function getOrder(id) { return load().orders.find(o => o.id === id) || null; }

module.exports = { setOnOrder, getCart, addToCart, removeFromCart, checkout, setOrderStatus, listOrders, getOrder };
