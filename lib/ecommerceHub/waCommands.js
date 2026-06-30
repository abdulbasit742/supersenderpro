'use strict';

/**
 * Ecommerce Hub — WhatsApp command handlers (Phase 1 + order replies).
 * Returns reply TEXT only. NEVER sends. Refreshes the cache from all adapters,
 * then answers. Wire into your inbound handler.
 *
 * Order of handling in handle():
 *   0. COD reply (haan/nahi) if this buyer has a pending COD confirmation
 *   1. !shop / !product <id> / !orders | !clients  (customer browse)
 *
 * Commands:
 *   !shop                -> list products across all platforms (paged)
 *   !product <id>        -> product details + link
 *   !orders | !clients   -> masked client/order summary
 */

const registry = require('./registry');
const productStore = require('./productStore');
const orderNotify = require('./orderNotify');

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

/**
 * handle(text, fromNumber) -> reply text, or null if nothing matched.
 * fromNumber is optional but required to match COD confirmations.
 */
async function handle(text, fromNumber) {
  const t = String(text || '').trim();
  const lower = t.toLowerCase();

  // 0) COD confirmation reply for this buyer, if any
  if (fromNumber) {
    const codReply = await orderNotify.handleBuyerReply(t, fromNumber);
    if (codReply) return codReply;
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
