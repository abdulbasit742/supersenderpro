'use strict';

/**
 * Ecommerce Hub — Squarespace Commerce adapter (LIVE read).
 * Dry-run by default: sample data, no network, no keys.
 * LIVE (SQUARESPACE_LIVE=true + API key): Commerce API products + orders
 * (Bearer auth). Read-only. No writes, no payment.
 */

const base = require('../connectorBase');

function isSet(v) { return v !== undefined && v !== null && String(v).trim() !== ''; }
function authHeaders() {
  return {
    'Authorization': 'Bearer ' + (process.env.SQUARESPACE_API_KEY || ''),
    'User-Agent': 'SuperSenderPro/1.0',
    'Accept': 'application/json'
  };
}

const SQUARESPACE = base.createAdapter({
  id: 'squarespace',
  label: 'Squarespace',

  isLive: function () {
    return String(process.env.SQUARESPACE_LIVE || 'false').toLowerCase() === 'true'
      && isSet(process.env.SQUARESPACE_API_KEY);
  },

  keyStatus: function () {
    return {
      SQUARESPACE_API_KEY: isSet(process.env.SQUARESPACE_API_KEY) ? 'masked' : 'missing'
    };
  },

  fetchProducts: async function () {
    const r = await base.httpGetJson('https://api.squarespace.com/1.0/commerce/products', authHeaders(), 9000);
    const list = r.json && Array.isArray(r.json.products) ? r.json.products : null;
    if (!list) throw new Error('squarespace_products_bad_response_' + (r.status || '?'));
    return list.map(function (p) {
      const v = (p.variants && p.variants[0]) || {};
      const pricing = v.pricing || {};
      const bp = pricing.basePrice || {};
      return {
        id: String(p.id || ''),
        title: p.name || 'Untitled',
        price: bp.value != null ? Number(bp.value) : null,
        currency: bp.currency || process.env.SQUARESPACE_CURRENCY || 'PKR',
        stock: (v.stock && v.stock.quantity != null) ? Number(v.stock.quantity) : null,
        url: p.url || null,
        image: (p.images && p.images[0] && p.images[0].url) || null
      };
    });
  },

  fetchOrders: async function () {
    const r = await base.httpGetJson('https://api.squarespace.com/1.0/commerce/orders', authHeaders(), 9000);
    const list = r.json && Array.isArray(r.json.result) ? r.json.result : null;
    if (!list) throw new Error('squarespace_orders_bad_response_' + (r.status || '?'));
    const byCust = {};
    list.forEach(function (o) {
      const ba = o.billingAddress || {};
      const email = o.customerEmail || null;
      const key = email || o.id;
      if (!byCust[key]) {
        byCust[key] = {
          id: String(key),
          name: [ba.firstName, ba.lastName].filter(Boolean).join(' ') || null,
          email: email, phone: ba.phone || null,
          orders: 0, lastOrderAt: null
        };
      }
      byCust[key].orders += 1;
      const at = o.createdOn || null;
      if (at && (!byCust[key].lastOrderAt || at > byCust[key].lastOrderAt)) byCust[key].lastOrderAt = at;
    });
    return Object.values(byCust);
  },

  sampleProducts: function () {
    return [
      { id: 'SQ-9101', title: 'Squarespace Sample Print', price: 4999, currency: 'PKR', stock: 12, url: 'https://example.squarespace.com/print' },
      { id: 'SQ-9102', title: 'Squarespace Sample Candle', price: 1299, currency: 'PKR', stock: 60, url: 'https://example.squarespace.com/candle' }
    ];
  },
  sampleOrders: function () {
    return [
      { id: 'SQC-9201', name: 'Sample SQ Buyer', email: 'sq@example.com', orders: 2, lastOrderAt: '2026-06-17' }
    ];
  }
});

module.exports = SQUARESPACE;
