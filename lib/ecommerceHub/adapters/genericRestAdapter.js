'use strict';

/**
 * Ecommerce Hub — Generic REST adapter.
 * Connect ANY platform that exposes a JSON products/orders endpoint, purely
 * via env config (no code change). Map fields with simple dot-paths.
 * Dry-run by default; live when GENERIC_LIVE=true + endpoints set. Read-only.
 */

const base = require('../connectorBase');

function isSet(v) { return v !== undefined && v !== null && String(v).trim() !== ''; }

// pull a nested value by "a.b.c" path
function dig(obj, dotPath) {
  if (!dotPath) return undefined;
  return String(dotPath).split('.').reduce(function (o, k) {
    return (o == null) ? undefined : o[k];
  }, obj);
}

// env-defined field map (with sane defaults)
function map(kind) {
  const prefix = 'GENERIC_' + kind + '_MAP_';
  return {
    list: process.env['GENERIC_' + kind + '_LIST_PATH'] || '',     // where the array lives in the response
    id: process.env[prefix + 'ID'] || 'id',
    title: process.env[prefix + 'TITLE'] || 'name',
    price: process.env[prefix + 'PRICE'] || 'price',
    stock: process.env[prefix + 'STOCK'] || 'stock',
    url: process.env[prefix + 'URL'] || 'url',
    name: process.env[prefix + 'NAME'] || 'customer_name',
    phone: process.env[prefix + 'PHONE'] || 'phone',
    email: process.env[prefix + 'EMAIL'] || 'email'
  };
}

function authHeaders() {
  const h = { 'Accept': 'application/json' };
  if (isSet(process.env.GENERIC_AUTH_HEADER) && isSet(process.env.GENERIC_AUTH_VALUE)) {
    h[process.env.GENERIC_AUTH_HEADER] = process.env.GENERIC_AUTH_VALUE;
  }
  return h;
}

function arrayFrom(json, listPath) {
  if (Array.isArray(json)) return json;
  const v = dig(json, listPath);
  return Array.isArray(v) ? v : [];
}

const GENERIC = base.createAdapter({
  id: 'generic',
  label: process.env.GENERIC_LABEL || 'Generic REST',

  isLive: function () {
    return String(process.env.GENERIC_LIVE || 'false').toLowerCase() === 'true'
      && isSet(process.env.GENERIC_PRODUCTS_URL);
  },

  keyStatus: function () {
    return {
      GENERIC_PRODUCTS_URL: isSet(process.env.GENERIC_PRODUCTS_URL) ? 'set' : 'missing',
      GENERIC_ORDERS_URL: isSet(process.env.GENERIC_ORDERS_URL) ? 'set' : 'missing',
      GENERIC_AUTH_HEADER: isSet(process.env.GENERIC_AUTH_HEADER) ? 'set' : 'none'
    };
  },

  fetchProducts: async function () {
    const r = await base.httpGetJson(process.env.GENERIC_PRODUCTS_URL, authHeaders(), 9000);
    const m = map('PRODUCTS');
    const list = arrayFrom(r.json, m.list);
    if (!list.length && !Array.isArray(r.json)) throw new Error('generic_products_bad_response_' + (r.status || '?'));
    return list.map(function (p) {
      return {
        id: dig(p, m.id), title: dig(p, m.title),
        price: dig(p, m.price) != null ? Number(dig(p, m.price)) : null,
        currency: process.env.GENERIC_CURRENCY || 'PKR',
        stock: dig(p, m.stock) != null ? Number(dig(p, m.stock)) : null,
        url: dig(p, m.url) || null, image: null
      };
    });
  },

  fetchOrders: async function () {
    if (!isSet(process.env.GENERIC_ORDERS_URL)) return [];
    const r = await base.httpGetJson(process.env.GENERIC_ORDERS_URL, authHeaders(), 9000);
    const m = map('ORDERS');
    const list = arrayFrom(r.json, m.list);
    const byKey = {};
    list.forEach(function (o) {
      const key = dig(o, m.email) || dig(o, m.phone) || dig(o, m.id);
      if (!byKey[key]) byKey[key] = { id: String(dig(o, m.id) || key), name: dig(o, m.name) || null, email: dig(o, m.email) || null, phone: dig(o, m.phone) || null, orders: 0, lastOrderAt: null };
      byKey[key].orders += 1;
    });
    return Object.values(byKey);
  },

  sampleProducts: function () {
    return [
      { id: 'GEN-8001', title: 'Generic Sample Product', price: 1499, currency: 'PKR', stock: 50, url: 'https://example.com/p/8001' }
    ];
  },
  sampleOrders: function () {
    return [
      { id: 'GC-9001', name: 'Generic Sample Buyer', email: 'g@example.com', orders: 1, lastOrderAt: '2026-06-20' }
    ];
  }
});

module.exports = GENERIC;
