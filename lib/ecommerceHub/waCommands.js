'use strict';

/**
 * Ecommerce Hub — WhatsApp command handlers (customer-facing) + lifecycle replies.
 * Returns reply TEXT only. NEVER sends.
 *
 * Order of handling in handle():
 *   0. STOP/UNSUB opt-out
 *   1. COD reply (haan/nahi) if pending
 *   2. Review rating reply (1-5) if pending
 *   3. !track [orderId]
 *   4. !coupon
 *   5. !shop / !product <id> / !orders | !clients
 */

const registry = require('./registry');
const productStore = require('./productStore');
const orderNotify = require('./orderNotify');
const tracking = require('./tracking');
const reviews = require('./reviews');
const coupons = require('./coupons');
const optOut = require('./optOutStore');

async function refreshCache() {
  const products = await registry.allProducts();
  const clients = await registry.allClients();
  productStore.saveProducts(products);
  productStore.saveClients(clients);
  return { products: products.length, clients: clients.length };
}

function money(p) { return p.price != null ? (p.currency + ' ' + p.price) : 'n/a'; }

function shopReply(page) {
  const all = productStore.getProducts();
  if (!all.length) return 'No products yet. Try again in a moment.';
  const perPage = 8;
  const p = Math.max(1, parseInt(page, 10) || 1);
  const slice = all.slice((p - 1) * perPage, (p - 1) * perPage + perPage);
  const lines = slice.map(function (it) {
    const stock = it.stock === 0 ? ' (out of stock)' : (it.stock != null ? ' \u00b7 ' + it.stock + ' left' : '');
    return '\u2022 [' + it.platform + '] ' + it.id + ' \u2014 ' + it.title + ' \u2014 ' + money(it) + stock;
  });
  const totalPages = Math.ceil(all.length / perPage);
  let footer = '\nReply *!product <id>* for details (e.g. !product DRZ-1001).';
  if (totalPages > 1) footer += '\nPage ' + p + '/' + totalPages + ' \u2014 reply *!shop ' + (p + 1) + '* for more.';
  return '\ud83d\uded2 *Shop \u2014 all platforms*\n\n' + lines.join('\n') + footer;
}

function productReply(id) {
  const it = productStore.findProduct(id);
  if (!it) return 'Product not found. Reply *!shop* to browse.';
  let out = '\ud83d\uded2 *' + it.title + '*\nPlatform: ' + it.platform + '\nPrice: ' + money(it);
  if (it.stock != null) out += '\nStock: ' + (it.stock === 0 ? 'out of stock' : it.stock);
  if (it.url) out += '\nBuy: ' + it.url;
  return out;
}

function clientsReply() {
  const all = productStore.getClients();
  if (!all.length) return 'No client data available.';
  const lines = all.slice(0, 10).map(function (c) {
    return '\u2022 [' + c.platform + '] ' + (c.name || 'client') + ' \u2014 ' + (c.phoneMasked || c.emailMasked || '\u2014') + ' \u2014 ' + c.orders + ' orders';
  });
  return '\ud83d\udc65 *Clients (masked)*\n\n' + lines.join('\n');
}

async function handle(text, fromNumber) {
  const t = String(text || '').trim();
  const lower = t.toLowerCase();

  // 0) opt-out
  if (fromNumber && /^(stop|unsub|unsubscribe|band karo|band)\b/i.test(t)) {
    optOut.optOut(fromNumber);
    return 'Aap unsubscribe ho gaye. Aapko ab marketing messages nahi aayenge. Dobara chalu karne ke liye START likhein.';
  }
  if (fromNumber && /^(start|resume)\b/i.test(t)) {
    optOut.upsertContact(fromNumber, {});
    return 'Aap dobara subscribe ho gaye. Shukriya!';
  }

  // 1) COD confirmation reply
  if (fromNumber) {
    const codReply = await orderNotify.handleBuyerReply(t, fromNumber);
    if (codReply) return codReply;
  }

  // 2) review rating reply
  if (fromNumber) {
    const rev = await reviews.handleReply(t, fromNumber);
    if (rev) return rev;
  }

  // 3) tracking lookup
  if (lower === '!track' || lower.indexOf('!track ') === 0) {
    const orderId = lower.indexOf('!track ') === 0 ? t.slice(7).trim() : '';
    return tracking.lookup(orderId, fromNumber);
  }

  // 4) coupon
  if (lower === '!coupon' || lower === '!discount' || lower === '!offer') {
    return coupons.currentForBuyer();
  }

  if (lower === '!shop' || lower.indexOf('!shop ') === 0) {
    await refreshCache();
    const page = lower.indexOf('!shop ') === 0 ? lower.split(/\s+/)[1] : 1;
    return shopReply(page);
  }
  if (lower.indexOf('!product ') === 0) {
    if (!productStore.getProducts().length) await refreshCache();
    return productReply(t.slice(9).trim());
  }
  if (lower === '!orders' || lower === '!clients') {
    await refreshCache();
    return clientsReply();
  }
  return null;
}

module.exports = { handle, refreshCache, shopReply, productReply, clientsReply };
