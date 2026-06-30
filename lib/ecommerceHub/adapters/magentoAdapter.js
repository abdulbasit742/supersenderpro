'use strict';

/**
 * Ecommerce Hub — Magento 2 adapter.
 * Dry-run by default: sample data, no network, no keys.
 * LIVE (MAGENTO_LIVE=true + hub live + token): calls the Magento 2 REST API
 * (GET /rest/V1/products and /orders) using a Bearer integration token.
 * Read-only. Never writes, never captures payment.
 */

const base = require('../connectorBase');

function isSet(v) { return v !== undefined && v !== null && String(v).trim() !== ''; }

function restUrl(pathPart) {
  const domain = String(process.env.MAGENTO_BASE_URL || '').replace(/\/+$/, '');
  return domain + '/rest/V1' + pathPart;
}
function authHeaders() {
  return { 'Authorization': 'Bearer ' + (process.env.MAGENTO_ACCESS_TOKEN || ''), 'Accept': 'application/json' };
}

const MAGENTO = base.createAdapter({
  id: 'magento',
  label: 'Magento',

  isLive: function () {
    return String(process.env.MAGENTO_LIVE || 'false').toLowerCase() === 'true'
      && isSet(process.env.MAGENTO_BASE_URL)
      && isSet(process.env.MAGENTO_ACCESS_TOKEN);
  },

  keyStatus: function () {
    return {
      MAGENTO_BASE_URL: isSet(process.env.MAGENTO_BASE_URL) ? 'set' : 'missing',
      MAGENTO_ACCESS_TOKEN: isSet(process.env.MAGENTO_ACCESS_TOKEN) ? 'masked' : 'missing'
    };
  },

  // LIVE: products. searchCriteria pageSize=50, read-only.
  fetchProducts: async function () {
    const url = restUrl('/products?searchCriteria[pageSize]=50&searchCriteria[currentPage]=1');
    const r = await base.httpGetJson(url, authHeaders(), 9000);
    const items = r.json && Array.isArray(r.json.items) ? r.json.items : null;
    if (!items) throw new Error('magento_products_bad_response_' + (r.status || '?'));
    return items.map(function (p) {
      var qty = null;
      if (p.extension_attributes && p.extension_attributes.stock_item) qty = Number(p.extension_attributes.stock_item.qty);
      return {
        id: String(p.sku || p.id || ''),
        title: p.name || 'Untitled',
        price: p.price != null ? Number(p.price) : null,
        currency: process.env.MAGENTO_CURRENCY || 'PKR',
        stock: qty,
        url: (process.env.MAGENTO_STOREFRONT_URL ? (String(process.env.MAGENTO_STOREFRONT_URL).replace(/\/+$/,'') + '/' + (p.custom_attributes ? (function(){var u=(p.custom_attributes.find(function(a){return a.attribute_code==='url_key';})||{}).value;return u?u+'.html':'';})() : '')) : null),
        image: null
      };
    });
  },

  // LIVE: orders -> masked client rows.
  fetchOrders: async function () {
    const url = restUrl('/orders?searchCriteria[pageSize]=50&searchCriteria[currentPage]=1&searchCriteria[sortOrders][0][field]=created_at&searchCriteria[sortOrders][0][direction]=DESC');
    const r = await base.httpGetJson(url, authHeaders(), 9000);
    const items = r.json && Array.isArray(r.json.items) ? r.json.items : null;
    if (!items) throw new Error('magento_orders_bad_response_' + (r.status || '?'));
    const byCust = {};
    items.forEach(function (o) {
      const key = o.customer_id || o.customer_email || o.entity_id;
      if (!byCust[key]) {
        byCust[key] = {
          id: String(o.customer_id || key),
          name: [o.customer_firstname, o.customer_lastname].filter(Boolean).join(' ') || null,
          email: o.customer_email || null,
          phone: (o.billing_address && o.billing_address.telephone) || null,
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
      { id: 'MAG-6001', title: 'Bluetooth Speaker Mini', price: 3299, currency: 'PKR', stock: 25, url: 'https://example.com/speaker.html' },
      { id: 'MAG-6002', title: 'Laptop Stand Aluminum', price: 2199, currency: 'PKR', stock: 11, url: 'https://example.com/stand.html' }
    ];
  },
  sampleOrders: function () {
    return [
      { id: 'MC-7001', name: 'Sample Magento Buyer', email: 'm@example.com', phone: '03009998888', orders: 2, lastOrderAt: '2026-06-17' }
    ];
  }
});

module.exports = MAGENTO;
