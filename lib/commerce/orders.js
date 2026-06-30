'use strict';
/**
 * orders.js — Commerce Feature #2: cart + orders.
 *
 * Sits on the catalog (#commerce1). Each contact has a cart; checkout turns it into an order:
 * decrement stock (mutex-safe), compute totals, record on the Customer 360 timeline, and emit an
 * 'order' event so the workflow engine + payment fulfillment can take over. Orders carry a status
 * lifecycle (pending_payment -> paid -> fulfilled / cancelled).
 *
 * Catalog access, the 360 recorder, and the event emitter are injected, so this stays decoupled.
 * Storage: JSON (data/orders.json).
 */

const fs = require('fs');
const path = require('path');

let catalog = null;
try { catalog = require('./catalog'); } catch { catalog = null; }

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'orders.json');

let recordEvent = null; // (phone, ev) => void  (customer360.recordEvent)
let emit = null;        // (event, ctx) => void (workflowEngine.emit)
function setHooks({ record, emitEvent } = {}) {
  if (typeof record === 'function') recordEvent = record;
  if (typeof emitEvent === 'function') emit = emitEvent;
}

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
  const data = load();
  return data.carts[normPhone(phone)] || { phone: normPhone(phone), items: [] };
}
function addToCart(phone, productId, qty = 1) {
  const p = normPhone(phone);
  if (!p) throw new Error('phone required');
  const data = load();
  const cart = data.carts[p] || { phone: p, items: [] };
  const existing = cart.items.find(i => i.productId === productId);
  if (existing) existing.qty += Number(qty);
  else cart.items.push({ productId, qty: Number(qty) });
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
  save(data);
  return cartView(cart);
}
function clearCart(phone) {
  const data = load();
  delete data.carts[normPhone(phone)];
  save(data);
  return { cleared: true };
}
function cartView(cart) {
  let total = 0; const lines = [];
  for (const it of cart.items) {
    const info = priceOf(it.productId);
    const price = info ? info.price : 0;
    const lineTotal = round2(price * it.qty);
    total += lineTotal;
    lines.push({ productId: it.productId, name: info ? info.name : it.productId, qty: it.qty, price, lineTotal });
  }
  return { phone: cart.phone, items: lines, total: round2(total), currency: (lines[0] && priceOf(lines[0].productId)?.currency) || 'PKR' };
}

// --- Checkout / orders ---
async function checkout(phone, opts = {}) {
  const p = normPhone(phone);
  if (!p) throw new Error('phone required');
  const data = load();
  const cart = data.carts[p];
  if (!cart || !cart.items.length) throw new Error('cart is empty');
  const view = cartView(cart);

  // reserve stock (mutex-safe) for each line
  if (catalog && typeof catalog.decrementStock === 'function') {
    for (const it of cart.items) {
      await catalog.decrementStock(it.productId, it.qty); // throws if insufficient
    }
  }

  const order = {
    id: `ORD-${Date.now()}-${Math.random().toString(16).slice(2,6)}`,
    phone: p,
    name: opts.name || '',
    items: view.items,
    total: view.total,
    currency: view.currency,
    status: 'pending_payment',  // pending_payment | paid | fulfilled | cancelled
    createdAt: nowIso()
  };
  data.orders.push(order);
  delete data.carts[p]; // cart consumed
  save(data);

  try { if (recordEvent) recordEvent(p, { type: 'order', amount: order.total, ref: order.id }); } catch { /* ignore */ }
  try { if (emit) emit('order', { phone: p, amount: order.total, orderId: order.id }); } catch { /* ignore */ }
  return order;
}

function setOrderStatus(id, status) {
  const allowed = ['pending_payment', 'paid', 'fulfilled', 'cancelled'];
  if (!allowed.includes(status)) throw new Error(`invalid status. use: ${allowed.join(', ')}`);
  const data = load();
  const o = data.orders.find(x => x.id === id);
  if (!o) return null;
  o.status = status;
  o.updatedAt = nowIso();
  save(data);
  if (status === 'paid' || status === 'fulfilled') {
    try { if (emit) emit(status === 'paid' ? 'order_paid' : 'order_fulfilled', { phone: o.phone, orderId: o.id, amount: o.total }); } catch { /* ignore */ }
  }
  return o;
}

function getOrder(id) { return load().orders.find(o => o.id === id) || null; }
function listOrders(filter = {}) {
  let rows = load().orders;
  if (filter.phone) rows = rows.filter(o => o.phone === normPhone(filter.phone));
  if (filter.status) rows = rows.filter(o => o.status === filter.status);
  rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return rows;
}

module.exports = { setHooks, getCart, addToCart, removeFromCart, clearCart, checkout, setOrderStatus, getOrder, listOrders };
