'use strict';

/**
 * Ecommerce Hub — Ecwid adapter (LIVE read).
 * Dry-run by default: sample data, no network, no keys.
 * LIVE (ECWID_LIVE=true + store id + token): Ecwid REST API v3 products + orders.
 * Read-only. No writes, no payment.
 */

const base = require('../connectorBase');

function isSet(v) { return v !== undefined && v !== null && String(v).trim() !== ''; }
function apiUrl(resource) {
  const store = String(process.env.ECWID_STORE_ID || '').replace(/\/+$/, '');
  const token = encodeURIComponent(process.env.ECWID_ACCESS_TOKEN || '');
  const sep = resource.indexOf('?') === -1 ? '?' : '&';
  return 'https://app.ecwid.com/api/v3/' + store + resource + sep + 'token=' + token;
}

const ECWID = base.createAdapter({
  id: 'ecwid',
  label: 'Ecwid',

  isLive: function () {
    return String(process.env.ECWID_LIVE || 'false').toLowerCase() === 'true'
      && isSet(process.env.ECWID_STORE_ID) && isSet(process.env.ECWID_ACCESS_TOKEN);
  },

  keyStatus: function () {
    return {
      ECWID_STORE_ID: isSet(process.env.ECWID_STORE_ID) ? 'set' : 'missing',
      ECWID_ACCESS_TOKEN: isSet(process.env.ECWID_ACCESS_TOKEN) ? 'masked' : 'missing'
    };
  },

  fetchProducts: async function () {
    const r = await base.httpGetJson(apiUrl('/products?limit=50'), { 'Accept': 'application/json' }, 9000);
    const list = r.json && Array.isArray(r.json.items) ? r.json.items : null;
    if (!list) throw new Error('ecwid_products_bad_response_' + (r.status || '?'));
    return list.map(function (p) {
      return {
        id: String(p.id || ''),
        title: p.name || 'Untitled',
        price: p.price != null ? Number(p.price) : null,
        currency: process.env.ECWID_CURRENCY || 'PKR',
        stock: p.quantity != null ? Number(p.quantity) : null,
        url: p.url || null,
        image: p.imageUrl || (p.originalImage && p.originalImage.url) || null
      };
    });
  },

  fetchOrders: async function () {
    const r = await base.httpGetJson(apiUrl('/orders?limit=50'), { 'Accept': 'application/json' }, 9000);
    const list = r.json && Array.isArray(r.json.items) ? r.json.items : null;
    if (!list) throw new Error('ecwid_orders_bad_response_' + (r.status || '?'));
    const byCust = {};
    list.forEach(function (o) {
      const bp = o.billingPerson || {};
      const email = o.email || null;
      const key = o.customerId || email || o.orderNumber || o.id;
      if (!byCust[key]) {
        byCust[key] = {
          id: String(o.customerId || key),
          name: bp.name || null,
          email: email, phone: bp.phone || o.phone || null,
          orders: 0, lastOrderAt: null
        };
      }
      byCust[key].orders += 1;
      const at = o.createDate || o.createTimestamp || null;
      if (at && (!byCust[key].lastOrderAt || at > byCust[key].lastOrderAt)) byCust[key].lastOrderAt = at;
    });
    return Object.values(byCust);
  },

  sampleProducts: function () {
    return [
      { id: 'ECW-1101', title: 'Ecwid Sample Sticker Pack', price: 499, currency: 'PKR', stock: 200, url: 'https://example.company.site/sticker' },
      { id: 'ECW-1102', title: 'Ecwid Sample Notebook', price: 799, currency: 'PKR', stock: 45, url: 'https://example.company.site/notebook' }
    ];
  },
  sampleOrders: function () {
    return [
      { id: 'ECWC-1201', name: 'Sample Ecwid Buyer', email: 'ecwid@example.com', phone: '03001119999', orders: 1, lastOrderAt: '2026-06-19' }
    ];
  }
});

module.exports = ECWID;
