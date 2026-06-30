'use strict';
/**
 * orders.js — Commerce Feature #2: cart + orders.
 *
 * Catalog (#commerce1) lists products; this lets a customer build a cart and check out. Carts are
 * per-contact; checkout prices items from the catalog, decrements stock (mutex-safe via the catalog),
 * creates an order, and emits an 'order' event so the rest of the system reacts (loyalty points,
 * Customer 360 timeline, payment, invoice). Order status moves pending -> paid -> fulfilled.
 *
 * Decoupled: catalog + event emitter injected. Storage: JSON (data/orders.json).
 */

const fs = require('fs');
const path = require('path');

let catalog = null;
try { catalog = require('./catalog'); } catch { catalog = null; }

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'orders.json');

let emit = null; // (event, ctx) => void  (workflow engine / 360 / loyalty)
function setEmitter(fn) { emit = typeof fn === 'function' ? fn : null; }

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
  if (!catalog) return null;
  const p = catalog.getProduct(productId);
  return p ? { name: p.name, price: p.price, currency: p.currency } : null;
}

// --- Cart ---
function getCart(phone) {
  const data = load();
  return data.carts[normPhone(phone)] || { phone: normPhone(phone), items: [], total: 0 };
}

function recalc(cart) {
  cart.total = round2(cart.items.reduce((s, it) => s + it.price * it.qty, 0));
  return cart;
}

function addToCart(phone, productId, qty = 1) {
  const p = priceOf(productId);
  if (!p) throw new Error('product not found');
  const data = load();
  const key = normPhone(phone);
  const cart = data.carts[key] || { phone: key, items: [], total: 0 };
  const existing = cart.items.find(i => i.productId === productId);
  if (existing) existing.qty += Number(qty);
  else cart.items.push({ productId, name: p.name, price: p.price, currency: p.currency, qty: Number(qty) });
  recalc(cart);
  data.carts[key] = cart;
  save(data);
  return cart;
}

function removeFromCart(phone, productId) {
  const data = load();
  const key = normPhone(phone);
  const cart = data.carts[key];
  if (!cart) return null;
  cart.items = cart.items.filter(i => i.productId !== productId);
  recalc(cart);
  save(data);
  return cart;
}

function clearCart(phone) {
  const data = load();
  delete data.carts[normPhone(phone)];
  save(data);
  return { cleared: true };
}

// --- Checkout / orders ---
async function checkout(phone, opts = {}) {
  const key = normPhone(phone);
  const data = load();
  const cart = data.carts[key];
  if (!cart || !cart.items.length) throw new Error('cart is empty');

  // decrement stock for each item (mutex-safe via catalog)
  if (catalog && typeof catalog.decrementStock === 'function') {
    for (const it of cart.items) {
      await catalog.decrementStock(it.productId, it.qty); // throws if insufficient
    }
  }

  const order = {
    id: `ORD-${Date.now()}-${Math.random().toString(16).slice(2,6)}`,
    contactPhone: key,
    items: cart.items,
    total: cart.total,
    currency: cart.items[0] ? cart.items[0].currency : 'PKR',
    status: 'pending',          // pending | paid | fulfilled | cancelled
    note: opts.note || '',
    createdAt: nowIso()
  };
  // reload (stock writes changed the file) then append
  const fresh = load();
  fresh.orders.push(order);
  delete fresh.carts[key];
  save(fresh);

  if (emit) { try { emit('order', { phone: key, amount: order.total, orderId: order.id, items: order.items }); } catch { /* ignore */ } }
  return order;
}

function setOrderStatus(orderId, status) {
  const allowed = ['pending', 'paid', 'fulfilled', 'cancelled'];
  if (!allowed.includes(status)) throw new Error(`invalid status. use: ${allowed.join(', ')}`);
  const data = load();
  const o = data.orders.find(x => x.id === orderId);
  if (!o) return null;
  o.status = status;
  o.updatedAt = nowIso();
  save(data);
  if (emit && status === 'paid') { try { emit('order_paid', { phone: o.contactPhone, amount: o.total, orderId: o.id }); } catch { /* ignore */ } }
  return o;
}

function getOrder(orderId) { return load().orders.find(o => o.id === orderId) || null; }
function listOrders(filter = {}) {
  let rows = load().orders;
  if (filter.contactPhone) rows = rows.filter(o => o.contactPhone === normPhone(filter.contactPhone));
  if (filter.status) rows = rows.filter(o => o.status === filter.status);
  rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return rows;
}

module.exports = { setEmitter, getCart, addToCart, removeFromCart, clearCart, checkout, setOrderStatus, getOrder, listOrders };
