'use strict';
/**
 * lib/salesPipeline/cartRecovery.js - abandoned-cart tracking + recovery nudges.
 * Recovery steps fire on config.cartRecoveryStepsMin after the cart goes idle.
 * Safe: dry-run prepares messages without sending.
 */
const { paths, config } = require('./config');
const store = require('./store');
const ai = require('./aiCopy');
const { nowISO, id, minutesAgo } = require('./util');

const read = (tid) => store.readJSON(paths.carts(tid), { carts: [] });
const write = (tid, d) => store.writeJSON(paths.carts(tid), d);

function trackCart(tid, input = {}) {
  const data = read(tid);
  const phone = (input.contact && input.contact.phone) || input.phone || '';
  const key = input.cartId || phone;
  let cart = data.carts.find((c) => (c.cartId === key || (phone && c.phone === phone)) && c.status === 'active');
  if (!cart) {
    cart = {
      id: id('cart'), cartId: key || id('cart'), tenantId: tid, phone,
      contact: { phone, name: (input.contact && input.contact.name) || input.name || '' },
      items: [], value: 0, status: 'active', recoveryStep: 0,
      createdAt: nowISO(), updatedAt: nowISO(), idleSince: nowISO(),
    };
    data.carts.push(cart);
  }
  if (Array.isArray(input.items)) cart.items = input.items;
  if (input.value !== undefined) cart.value = Number(input.value || 0);
  else cart.value = (cart.items || []).reduce((s, i) => s + Number(i.unitPrice || i.price || 0) * Number(i.qty || 1), 0);
  cart.updatedAt = nowISO();
  cart.idleSince = nowISO();
  write(tid, data);
  return cart;
}

function setStatus(tid, cartId, status, extra = {}) {
  const data = read(tid);
  const cart = data.carts.find((c) => c.cartId === cartId || c.id === cartId);
  if (!cart) return null;
  cart.status = status;
  cart.updatedAt = nowISO();
  Object.assign(cart, extra);
  write(tid, data);
  if (global.wsEvent) global.wsEvent('sales.cart_status', { tenantId: tid, cartId: cart.cartId, status });
  return cart;
}

function listCarts(tid, status) {
  const carts = read(tid).carts;
  return status ? carts.filter((c) => c.status === status) : carts;
}

async function processRecovery(tid) {
  const data = read(tid);
  const steps = config.cartRecoveryStepsMin;
  const prepared = [];
  for (const cart of data.carts) {
    if (cart.status !== 'active') continue;
    const step = cart.recoveryStep || 0;
    if (step >= steps.length) { cart.status = 'abandoned'; cart.abandonedAt = nowISO(); continue; }
    if (minutesAgo(cart.idleSince) < steps[step]) continue;
    const message = await ai.cartRecoveryCopy(cart, step);
    let sent = false;
    if (!config.dryRun && typeof global.sendWhatsApp === 'function' && cart.phone) {
      try { await global.sendWhatsApp(cart.phone, message, { tenantId: tid, source: 'cart_recovery' }); sent = true; } catch { sent = false; }
    }
    cart.recoveryStep = step + 1;
    cart.lastNudgeAt = nowISO();
    cart.lastNudge = { step, message, status: sent ? 'sent' : (config.dryRun ? 'prepared' : 'failed'), ts: nowISO() };
    prepared.push({ cartId: cart.cartId, step, status: cart.lastNudge.status, message });
    if (global.wsEvent) global.wsEvent('sales.cart_recovery', { tenantId: tid, cartId: cart.cartId, step });
  }
  write(tid, data);
  return { dryRun: config.dryRun, count: prepared.length, prepared };
}

module.exports = { trackCart, setStatus, listCarts, processRecovery };
