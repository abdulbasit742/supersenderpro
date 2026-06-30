'use strict';

/**
 * Ecommerce Hub — OpenCart adapter (LIVE read).
 * Dry-run by default: sample data, no network, no keys.
 * OpenCart has no single built-in REST API, so this targets the common REST
 * API extension pattern: GET {OPENCART_BASE_URL}/index.php?route=rest/...
 * with a Bearer token. Endpoints are configurable to fit your extension.
 * Read-only. No writes, no payment.
 */

const base = require('../connectorBase');

function isSet(v) { return v !== undefined && v !== null && String(v).trim() !== ''; }
function baseUrl() { return String(process.env.OPENCART_BASE_URL || '').replace(/\/+$/, ''); }
function route(r) {
  // default routes follow the popular opencart REST API extension; override via env
  return baseUrl() + '/index.php?route=' + r;
}
function authHeaders() {
  const h = { 'Accept': 'application/json' };
  if (isSet(process.env.OPENCART_API_TOKEN)) h['Authorization'] = 'Bearer ' + process.env.OPENCART_API_TOKEN;
  return h;
}
function arr(json) {
  if (Array.isArray(json)) return json;
  if (json && Array.isArray(json.data)) return json.data;
  if (json && Array.isArray(json.products)) return json.products;
  if (json && Array.isArray(json.orders)) return json.orders;
  return null;
}

const OPENCART = base.createAdapter({
  id: 'opencart',
  label: 'OpenCart',

  isLive: function () {
    return String(process.env.OPENCART_LIVE || 'false').toLowerCase() === 'true'
      && isSet(process.env.OPENCART_BASE_URL) && isSet(process.env.OPENCART_API_TOKEN);
  },

  keyStatus: function () {
    return {
      OPENCART_BASE_URL: isSet(process.env.OPENCART_BASE_URL) ? 'set' : 'missing',
      OPENCART_API_TOKEN: isSet(process.env.OPENCART_API_TOKEN) ? 'masked' : 'missing'
    };
  },

  fetchProducts: async function () {
    const url = process.env.OPENCART_PRODUCTS_ROUTE
      ? route(process.env.OPENCART_PRODUCTS_ROUTE)
      : route('rest/products/products&limit=50');
    const r = await base.httpGetJson(url, authHeaders(), 9000);
    const list = arr(r.json);
    if (!list) throw new Error('opencart_products_bad_response_' + (r.status || '?'));
    return list.map(function (p) {
      return {
        id: String(p.product_id || p.id || ''),
        title: p.name || p.title || 'Untitled',
        price: p.price != null ? Number(String(p.price).replace(/[^0-9.]/g, '')) : null,
        currency: process.env.OPENCART_CURRENCY || 'PKR',
        stock: p.quantity != null ? Number(p.quantity) : null,
        url: p.href || p.url || null,
        image: p.thumb || p.image || null
      };
    });
  },

  fetchOrders: async function () {
    const url = process.env.OPENCART_ORDERS_ROUTE
      ? route(process.env.OPENCART_ORDERS_ROUTE)
      : route('rest/orders/orders&limit=50');
    const r = await base.httpGetJson(url, authHeaders(), 9000);
    const list = arr(r.json) || [];
    const byCust = {};
    list.forEach(function (o) {
      const key = o.customer_id || o.email || o.order_id || o.id;
      if (!byCust[key]) {
        byCust[key] = {
          id: String(o.customer_id || key),
          name: [o.firstname, o.lastname].filter(Boolean).join(' ') || o.customer || null,
          email: o.email || null, phone: o.telephone || o.phone || null,
          orders: 0, lastOrderAt: null
        };
      }
      byCust[key].orders += 1;
      const at = o.date_added || null;
      if (at && (!byCust[key].lastOrderAt || at > byCust[key].lastOrderAt)) byCust[key].lastOrderAt = at;
    });
    return Object.values(byCust);
  },

  sampleProducts: function () {
    return [
      { id: 'OC-5101', title: 'OpenCart Sample Phone Case', price: 699, currency: 'PKR', stock: 95, url: 'https://example.com/case' },
      { id: 'OC-5102', title: 'OpenCart Sample Power Bank', price: 2999, currency: 'PKR', stock: 14, url: 'https://example.com/powerbank' }
    ];
  },
  sampleOrders: function () {
    return [
      { id: 'OCC-6101', name: 'Sample OC Buyer', email: 'oc@example.com', phone: '03006667777', orders: 2, lastOrderAt: '2026-06-18' }
    ];
  }
});

module.exports = OPENCART;
