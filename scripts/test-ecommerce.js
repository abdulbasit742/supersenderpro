'use strict';

/**
 * scripts/test-ecommerce.js
 * Offline smoke test for the e-commerce connection layer. Every connector is
 * exercised against a MOCK http client (no live store, no network). Verifies
 * credential validation, connection tests, product/order normalization, Daraz
 * request signing, and the full manager connect -> sync -> confirm flow.
 */

const os = require('os');
const path = require('path');
const fs = require('fs');
process.env.CAMPAIGN_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ssp-eco-'));

const registry = require('../lib/ecommerce/index');
const manager = require('../lib/ecommerceManager');
const store = require('../lib/ecommerceStore');

let failures = 0;
function assert(c, m) { if (c) console.log('  \u2713 ' + m); else { console.error('  \u2717 ' + m); failures++; } }

/** Build a mock http that routes by URL substring. */
function mockHttp(routes) {
  return async (opts) => {
    for (const [needle, resp] of routes) {
      if (opts.url.includes(needle)) return typeof resp === 'function' ? resp(opts) : resp;
    }
    return { status: 404, data: { error: 'no mock for ' + opts.url } };
  };
}

(async () => {
  console.log('E-commerce connections smoke test');

  // ---- registry ----
  assert(registry.listProviders().length === 5, 'five providers registered');
  assert(registry.getProvider('shopify') && registry.getProvider('SHOPIFY'), 'lookup case-insensitive');
  assert(registry.getProvider('nope') === null, 'unknown provider -> null');

  // ---- validation ----
  assert(registry.getProvider('shopify').validate({}).ok === false, 'shopify rejects empty creds');
  assert(registry.getProvider('woocommerce').validate({ storeUrl: 'x', consumerKey: 'a', consumerSecret: 'b' }).ok, 'woo accepts full creds');
  assert(registry.getProvider('amazon').validate({ refreshToken: 'r' }).ok === false, 'amazon needs more creds');

  // ---- shopify connect + sync (mock) ----
  const shopifyHttp = mockHttp([
    ['/shop.json', { status: 200, data: { shop: { name: 'My Store', domain: 'my.myshopify.com', currency: 'USD' } } }],
    ['/products.json', { status: 200, data: { products: [{ id: 1, title: 'Tee', variants: [{ sku: 'T1', price: '19.99', inventory_quantity: 5 }], images: [{ src: 'img' }] }] } }],
    ['/orders.json', { status: 200, data: { orders: [{ id: 99, name: '#1001', currency: 'USD', total_price: '19.99', customer: { first_name: 'Ali', phone: '92300' }, line_items: [{ title: 'Tee', quantity: 1, price: '19.99' }] }] } }],
  ]);
  const sp = registry.getProvider('shopify');
  const t = await sp.testConnection({ shopUrl: 'my', accessToken: 'x' }, shopifyHttp);
  assert(t.ok && t.info.name === 'My Store', 'shopify testConnection ok');
  const prods = await sp.fetchProducts({ shopUrl: 'my', accessToken: 'x' }, shopifyHttp);
  assert(prods.length === 1 && prods[0].sku === 'T1' && prods[0].price === 19.99, 'shopify product normalized');
  const ords = await sp.fetchOrders({ shopUrl: 'my', accessToken: 'x' }, shopifyHttp);
  assert(ords[0].customerName === 'Ali' && ords[0].customerPhone === '92300', 'shopify order normalized');

  // ---- woocommerce normalize ----
  const woo = registry.getProvider('woocommerce');
  const wooHttp = mockHttp([
    ['/system_status', { status: 200, data: { environment: { site_title: 'WooShop', version: '8.0' } } }],
    ['/products', { status: 200, data: [{ id: 7, name: 'Mug', sku: 'M1', price: '5', stock_quantity: 12, images: [{ src: 'm' }], permalink: 'u' }] }],
    ['/orders', { status: 200, data: [{ id: 5, number: '5', currency: 'PKR', total: '500', billing: { first_name: 'Sara', phone: '92311' }, line_items: [{ name: 'Mug', quantity: 2, price: '250' }] }] }],
  ]);
  assert((await woo.testConnection({ storeUrl: 'https://x', consumerKey: 'a', consumerSecret: 'b' }, wooHttp)).ok, 'woo testConnection ok');
  assert((await woo.fetchProducts({ storeUrl: 'https://x', consumerKey: 'a', consumerSecret: 'b' }, wooHttp))[0].title === 'Mug', 'woo product normalized');
  assert((await woo.fetchOrders({ storeUrl: 'https://x', consumerKey: 'a', consumerSecret: 'b' }, wooHttp))[0].customerName === 'Sara', 'woo order normalized');

  // ---- daraz signing is deterministic ----
  const daraz = registry.getProvider('daraz');
  const s1 = daraz.sign('/orders/get', { app_key: 'k', timestamp: '1', a: 'b' }, 'secret');
  const s2 = daraz.sign('/orders/get', { a: 'b', timestamp: '1', app_key: 'k' }, 'secret');
  assert(s1 === s2 && /^[0-9A-F]+$/.test(s1), 'daraz sign stable + uppercase hex');
  const darazHttp = mockHttp([['/seller/get', { status: 200, data: { code: '0', data: { name: 'Daraz Shop' } } }]]);
  assert((await daraz.testConnection({ appKey: 'k', appSecret: 's', accessToken: 't' }, darazHttp)).ok, 'daraz testConnection ok');

  // ---- etsy normalize (price divisor) ----
  const etsy = registry.getProvider('etsy');
  const etsyHttp = mockHttp([
    ['/shops/123/listings/active', { status: 200, data: { results: [{ listing_id: 1, title: 'Art', quantity: 3, price: { amount: 2500, divisor: 100, currency_code: 'USD' }, url: 'u' }] } }],
    ['/shops/123', { status: 200, data: { shop_name: 'EtsyShop' } }],
  ]);
  assert((await etsy.testConnection({ apiKey: 'a', accessToken: 'b', shopId: '123' }, etsyHttp)).info.name === 'EtsyShop', 'etsy testConnection');
  assert((await etsy.fetchProducts({ apiKey: 'a', accessToken: 'b', shopId: '123' }, etsyHttp))[0].price === 25, 'etsy price divisor applied');

  // ---- amazon LWA token flow ----
  const amazon = registry.getProvider('amazon');
  const amzHttp = mockHttp([
    ['o2/token', { status: 200, data: { access_token: 'atk' } }],
    ['/orders/v0/orders', { status: 200, data: { payload: { Orders: [{ AmazonOrderId: '111-22', OrderStatus: 'Shipped', OrderTotal: { Amount: '40', CurrencyCode: 'USD' } }] } } }],
  ]);
  assert((await amazon.testConnection({ refreshToken: 'r', clientId: 'c', clientSecret: 's', marketplaceId: 'M' }, amzHttp)).ok, 'amazon LWA token ok');
  assert((await amazon.fetchOrders({ refreshToken: 'r', clientId: 'c', clientSecret: 's', marketplaceId: 'M' }, amzHttp))[0].externalId === '111-22', 'amazon order normalized');

  // ---- manager: connect -> persist -> sync -> confirm ----
  const conn = await manager.connect('shopify', { shopUrl: 'my', accessToken: 'x' }, shopifyHttp);
  assert(conn.ok && conn.connection.id, 'manager connect persists');
  assert(conn.connection.hasCredentials === true && conn.connection.credentials === undefined, 'credentials redacted in API view');
  const id = conn.connection.id;
  const sync = await manager.syncProducts(id, shopifyHttp);
  assert(sync.ok && sync.count === 1, 'manager syncProducts');
  const fo = await manager.fetchOrders(id, shopifyHttp);
  assert(fo.ok && fo.count === 1, 'manager fetchOrders');

  let sentTo = null, sentMsg = null;
  const order = store.getConnection(id).orders[0];
  const conf = await manager.sendOrderConfirmation(order, { sendMessage: async (to, msg) => { sentTo = to; sentMsg = msg; } });
  assert(conf.sent && sentTo === '92300' && /1001/.test(sentMsg), 'order confirmation sent via WhatsApp');

  assert(manager.disconnect(id) === true, 'manager disconnect');

  // bad creds rejected before save
  const bad = await manager.connect('shopify', {}, shopifyHttp);
  assert(bad.ok === false, 'connect rejects invalid creds');

  console.log(failures === 0 ? '\nALL TESTS PASSED' : `\n${failures} TEST(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
