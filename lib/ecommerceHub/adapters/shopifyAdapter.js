'use strict';

/**
 * Ecommerce Hub — Shopify adapter (LIVE read).
 * Dry-run by default: sample data, no network, no keys.
 * LIVE (SHOPIFY_LIVE=true + hub live + domain + token): calls the Shopify
 * Admin REST API (products.json, orders.json). Read-only. No writes, no payment.
 */

const base = require('../connectorBase');

function isSet(v) { return v !== undefined && v !== null && String(v).trim() !== ''; }
function ver() { return process.env.SHOPIFY_API_VERSION || '2024-01'; }
function apiUrl(resource) {
  const domain = String(process.env.SHOPIFY_STORE_DOMAIN || '').replace(/^https?:\/\//, '').replace(/\/+$/, '');
  return 'https://' + domain + '/admin/api/' + ver() + resource;
}
function authHeaders() {
  return { 'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN || '', 'Accept': 'application/json' };
}

const SHOPIFY = base.createAdapter({
  id: 'shopify',
  label: 'Shopify',

  isLive: function () {
    return String(process.env.SHOPIFY_LIVE || 'false').toLowerCase() === 'true'
      && isSet(process.env.SHOPIFY_STORE_DOMAIN) && isSet(process.env.SHOPIFY_ACCESS_TOKEN);
  },

  keyStatus: function () {
    return {
      SHOPIFY_STORE_DOMAIN: isSet(process.env.SHOPIFY_STORE_DOMAIN) ? 'set' : 'missing',
      SHOPIFY_ACCESS_TOKEN: isSet(process.env.SHOPIFY_ACCESS_TOKEN) ? 'masked' : 'missing'
    };
  },

  fetchProducts: async function () {
    const r = await base.httpGetJson(apiUrl('/products.json?limit=50'), authHeaders(), 9000);
    const list = r.json && Array.isArray(r.json.products) ? r.json.products : null;
    if (!list) throw new Error('shopify_products_bad_response_' + (r.status || '?'));
    const domain = String(process.env.SHOPIFY_STORE_DOMAIN || '').replace(/^https?:\/\//, '').replace(/\/+$/, '');
    return list.map(function (p) {
      const v = (p.variants && p.variants[0]) || {};
      return {
        id: String(p.id || ''),
        title: p.title || 'Untitled',
        price: v.price != null ? Number(v.price) : null,
        currency: process.env.SHOPIFY_CURRENCY || 'PKR',
        stock: v.inventory_quantity != null ? Number(v.inventory_quantity) : null,
        url: p.handle ? ('https://' + domain + '/products/' + p.handle) : null,
        image: (p.image && p.image.src) || null
      };
    });
  },

  fetchOrders: async function () {
    const r = await base.httpGetJson(apiUrl('/orders.json?status=any&limit=50'), authHeaders(), 9000);
    const list = r.json && Array.isArray(r.json.orders) ? r.json.orders : null;
    if (!list) throw new Error('shopify_orders_bad_response_' + (r.status || '?'));
    const byCust = {};
    list.forEach(function (o) {
      const c = o.customer || {};
      const key = c.id || o.email || o.id;
      if (!byCust[key]) {
        byCust[key] = {
          id: String(c.id || key),
          name: [c.first_name, c.last_name].filter(Boolean).join(' ') || null,
          email: o.email || c.email || null,
          phone: o.phone || (o.shipping_address && o.shipping_address.phone) || null,
          orders: 0, lastOrderAt: null
        };
      }
      byCust[key].orders += 1;
      const at = o.created_at || null;
      if (at && (!byCust[key].lastOrderAt || at > byCust[key].lastOrderAt)) byCust[key].lastOrderAt = at;
    });
    return Object.values(byCust);
  },

  sampleProducts: function () {
    return [
      { id: 'SHP-2001', title: 'Organic Cotton Tee', price: 1799, currency: 'PKR', stock: 120, url: 'https://example.myshopify.com/products/tee' },
      { id: 'SHP-2002', title: 'Canvas Tote Bag', price: 999, currency: 'PKR', stock: 33, url: 'https://example.myshopify.com/products/tote' }
    ];
  },
  sampleOrders: function () {
    return [
      { id: 'SC-3001', name: 'Sample Customer X', email: 'x@example.com', orders: 2, lastOrderAt: '2026-06-18' }
    ];
  }
});

module.exports = SHOPIFY;
