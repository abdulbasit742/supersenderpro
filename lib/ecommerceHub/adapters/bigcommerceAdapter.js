'use strict';

/**
 * Ecommerce Hub — BigCommerce adapter (LIVE read).
 * Dry-run by default: sample data, no network, no keys.
 * LIVE (BIGCOMMERCE_LIVE=true + store hash + token): v3 catalog for products,
 * v2 orders for customers. Read-only. No writes, no payment.
 */

const base = require('../connectorBase');

function isSet(v) { return v !== undefined && v !== null && String(v).trim() !== ''; }
function hash() { return String(process.env.BIGCOMMERCE_STORE_HASH || '').replace(/\/+$/, ''); }
function v3(resource) { return 'https://api.bigcommerce.com/stores/' + hash() + '/v3' + resource; }
function v2(resource) { return 'https://api.bigcommerce.com/stores/' + hash() + '/v2' + resource; }
function authHeaders() {
  return { 'X-Auth-Token': process.env.BIGCOMMERCE_ACCESS_TOKEN || '', 'Accept': 'application/json' };
}

const BIGCOMMERCE = base.createAdapter({
  id: 'bigcommerce',
  label: 'BigCommerce',

  isLive: function () {
    return String(process.env.BIGCOMMERCE_LIVE || 'false').toLowerCase() === 'true'
      && isSet(process.env.BIGCOMMERCE_STORE_HASH) && isSet(process.env.BIGCOMMERCE_ACCESS_TOKEN);
  },

  keyStatus: function () {
    return {
      BIGCOMMERCE_STORE_HASH: isSet(process.env.BIGCOMMERCE_STORE_HASH) ? 'set' : 'missing',
      BIGCOMMERCE_ACCESS_TOKEN: isSet(process.env.BIGCOMMERCE_ACCESS_TOKEN) ? 'masked' : 'missing'
    };
  },

  fetchProducts: async function () {
    const r = await base.httpGetJson(v3('/catalog/products?limit=50'), authHeaders(), 9000);
    const list = r.json && Array.isArray(r.json.data) ? r.json.data : null;
    if (!list) throw new Error('bigcommerce_products_bad_response_' + (r.status || '?'));
    return list.map(function (p) {
      return {
        id: String(p.id || ''),
        title: p.name || 'Untitled',
        price: p.price != null ? Number(p.price) : null,
        currency: process.env.BIGCOMMERCE_CURRENCY || 'PKR',
        stock: p.inventory_level != null ? Number(p.inventory_level) : null,
        url: (p.custom_url && p.custom_url.url) || null,
        image: null
      };
    });
  },

  fetchOrders: async function () {
    const r = await base.httpGetJson(v2('/orders?limit=50&sort=date_created:desc'), authHeaders(), 9000);
    const list = Array.isArray(r.json) ? r.json : null;
    if (!list) throw new Error('bigcommerce_orders_bad_response_' + (r.status || '?'));
    const byCust = {};
    list.forEach(function (o) {
      const b = o.billing_address || {};
      const key = o.customer_id || b.email || o.id;
      if (!byCust[key]) {
        byCust[key] = {
          id: String(o.customer_id || key),
          name: [b.first_name, b.last_name].filter(Boolean).join(' ') || null,
          email: b.email || null, phone: b.phone || null,
          orders: 0, lastOrderAt: null
        };
      }
      byCust[key].orders += 1;
      const at = o.date_created || null;
      if (at && (!byCust[key].lastOrderAt || at > byCust[key].lastOrderAt)) byCust[key].lastOrderAt = at;
    });
    return Object.values(byCust);
  },

  sampleProducts: function () {
    return [
      { id: 'BC-3101', title: 'Stainless Water Bottle', price: 1399, currency: 'PKR', stock: 80, url: 'https://example.com/bottle' },
      { id: 'BC-3102', title: 'Yoga Mat Premium', price: 2599, currency: 'PKR', stock: 22, url: 'https://example.com/yoga-mat' }
    ];
  },
  sampleOrders: function () {
    return [
      { id: 'BCC-4101', name: 'Sample BC Buyer', email: 'bc@example.com', phone: '03004445555', orders: 3, lastOrderAt: '2026-06-19' }
    ];
  }
});

module.exports = BIGCOMMERCE;
