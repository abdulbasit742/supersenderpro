'use strict';

/**
 * Ecommerce Hub — WooCommerce adapter.
 * Dry-run by default: sample data, no network, no keys.
 * LIVE (WOO_LIVE=true + hub live + keys set): calls the WooCommerce REST API
 * (GET /wp-json/wc/v3/products and /orders) using Basic auth over HTTPS.
 * Read-only. Never writes products/orders. Never captures payment.
 */

const base = require('../connectorBase');

function isSet(v) { return v !== undefined && v !== null && String(v).trim() !== ''; }

// Build the WooCommerce REST base URL from the store domain.
function apiUrl(pathPart) {
  const domain = String(process.env.WOO_STORE_URL || '').replace(/\/+$/, '');
  const ck = encodeURIComponent(process.env.WOO_CONSUMER_KEY || '');
  const cs = encodeURIComponent(process.env.WOO_CONSUMER_SECRET || '');
  // Pass keys as query params over HTTPS (WooCommerce-supported).
  const sep = pathPart.indexOf('?') === -1 ? '?' : '&';
  return domain + '/wp-json/wc/v3' + pathPart + sep + 'consumer_key=' + ck + '&consumer_secret=' + cs + '&per_page=50';
}

const WOO = base.createAdapter({
  id: 'woocommerce',
  label: 'WooCommerce',

  isLive: function () {
    return String(process.env.WOO_LIVE || 'false').toLowerCase() === 'true'
      && isSet(process.env.WOO_STORE_URL)
      && isSet(process.env.WOO_CONSUMER_KEY)
      && isSet(process.env.WOO_CONSUMER_SECRET);
  },

  keyStatus: function () {
    return {
      WOO_STORE_URL: isSet(process.env.WOO_STORE_URL) ? 'set' : 'missing',
      WOO_CONSUMER_KEY: isSet(process.env.WOO_CONSUMER_KEY) ? 'masked' : 'missing',
      WOO_CONSUMER_SECRET: isSet(process.env.WOO_CONSUMER_SECRET) ? 'masked' : 'missing'
    };
  },

  // LIVE: products
  fetchProducts: async function () {
    const r = await base.httpGetJson(apiUrl('/products'), { 'Accept': 'application/json' }, 9000);
    if (!r.json || !Array.isArray(r.json)) throw new Error('woo_products_bad_response_' + (r.status || '?'));
    return r.json.map(function (p) {
      return {
        id: p.id, title: p.name, price: p.price ? Number(p.price) : null,
        currency: process.env.WOO_CURRENCY || 'PKR',
        stock: p.stock_quantity != null ? Number(p.stock_quantity) : null,
        url: p.permalink || null,
        image: (p.images && p.images[0] && p.images[0].src) || null
      };
    });
  },

  // LIVE: orders -> collapsed into masked client rows (base.normalizeClient masks PII)
  fetchOrders: async function () {
    const r = await base.httpGetJson(apiUrl('/orders'), { 'Accept': 'application/json' }, 9000);
    if (!r.json || !Array.isArray(r.json)) throw new Error('woo_orders_bad_response_' + (r.status || '?'));
    const byEmail = {};
    r.json.forEach(function (o) {
      const b = o.billing || {};
      const key = b.email || b.phone || String(o.customer_id || o.id);
      if (!byEmail[key]) {
        byEmail[key] = {
          id: String(o.customer_id || key),
          name: [b.first_name, b.last_name].filter(Boolean).join(' ') || null,
          email: b.email || null, phone: b.phone || null,
          orders: 0, lastOrderAt: null
        };
      }
      byEmail[key].orders += 1;
      const at = o.date_created || null;
      if (at && (!byEmail[key].lastOrderAt || at > byEmail[key].lastOrderAt)) byEmail[key].lastOrderAt = at;
    });
    return Object.values(byEmail);
  },

  sampleProducts: function () {
    return [
      { id: 'WOO-4001', title: 'Handmade Leather Wallet', price: 3499, currency: 'PKR', stock: 18, url: 'https://example.com/product/wallet' },
      { id: 'WOO-4002', title: 'Ceramic Coffee Mug', price: 899, currency: 'PKR', stock: 64, url: 'https://example.com/product/mug' }
    ];
  },
  sampleOrders: function () {
    return [
      { id: 'WC-5001', name: 'Sample Woo Buyer', email: 'buyer@example.com', phone: '03001112222', orders: 4, lastOrderAt: '2026-06-19' }
    ];
  }
});

module.exports = WOO;
