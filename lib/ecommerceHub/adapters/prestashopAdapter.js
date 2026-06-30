'use strict';

/**
 * Ecommerce Hub — PrestaShop adapter.
 * Dry-run by default: sample data, no network, no keys.
 * LIVE (PRESTA_LIVE=true + base URL + API key): calls the PrestaShop Webservice
 * API (?output_format=JSON) using the API key as Basic-auth username.
 * Read-only. Never writes, never captures payment.
 */

const base = require('../connectorBase');

function isSet(v) { return v !== undefined && v !== null && String(v).trim() !== ''; }

function wsUrl(resource) {
  const domain = String(process.env.PRESTA_BASE_URL || '').replace(/\/+$/, '');
  return domain + '/api/' + resource + '?output_format=JSON&display=full&limit=50';
}
function authHeaders() {
  // PrestaShop uses the API key as the Basic-auth username, empty password.
  const key = process.env.PRESTA_API_KEY || '';
  const token = Buffer.from(key + ':', 'utf8').toString('base64');
  return { 'Authorization': 'Basic ' + token, 'Accept': 'application/json' };
}

const PRESTA = base.createAdapter({
  id: 'prestashop',
  label: 'PrestaShop',

  isLive: function () {
    return String(process.env.PRESTA_LIVE || 'false').toLowerCase() === 'true'
      && isSet(process.env.PRESTA_BASE_URL) && isSet(process.env.PRESTA_API_KEY);
  },

  keyStatus: function () {
    return {
      PRESTA_BASE_URL: isSet(process.env.PRESTA_BASE_URL) ? 'set' : 'missing',
      PRESTA_API_KEY: isSet(process.env.PRESTA_API_KEY) ? 'masked' : 'missing'
    };
  },

  fetchProducts: async function () {
    const r = await base.httpGetJson(wsUrl('products'), authHeaders(), 9000);
    const list = (r.json && (r.json.products || [])) || [];
    if (!Array.isArray(list)) throw new Error('presta_products_bad_response_' + (r.status || '?'));
    return list.map(function (p) {
      // PrestaShop name can be a localized array; take first value.
      let title = p.name;
      if (Array.isArray(title)) title = (title[0] && (title[0].value || title[0])) || 'Untitled';
      return {
        id: String(p.id || ''), title: title || 'Untitled',
        price: p.price != null ? Number(p.price) : null,
        currency: process.env.PRESTA_CURRENCY || 'PKR',
        stock: p.quantity != null ? Number(p.quantity) : null,
        url: null, image: null
      };
    });
  },

  fetchOrders: async function () {
    const r = await base.httpGetJson(wsUrl('orders'), authHeaders(), 9000);
    const list = (r.json && (r.json.orders || [])) || [];
    const byCust = {};
    (Array.isArray(list) ? list : []).forEach(function (o) {
      const key = o.id_customer || o.id;
      if (!byCust[key]) byCust[key] = { id: String(o.id_customer || key), name: null, email: null, phone: null, orders: 0, lastOrderAt: o.date_add || null };
      byCust[key].orders += 1;
    });
    return Object.values(byCust);
  },

  sampleProducts: function () {
    return [
      { id: 'PS-7001', title: 'PrestaShop Sample Tee', price: 1599, currency: 'PKR', stock: 40, url: 'https://example.com/tee' },
      { id: 'PS-7002', title: 'PrestaShop Sample Cap', price: 799, currency: 'PKR', stock: 15, url: 'https://example.com/cap' }
    ];
  },
  sampleOrders: function () {
    return [
      { id: 'PC-8001', name: 'Presta Sample Buyer', orders: 2, lastOrderAt: '2026-06-18' }
    ];
  }
});

module.exports = PRESTA;
