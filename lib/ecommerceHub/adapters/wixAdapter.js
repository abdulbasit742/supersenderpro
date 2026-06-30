'use strict';

/**
 * Ecommerce Hub — Wix Stores adapter (LIVE read).
 * Dry-run by default: sample data, no network, no keys.
 * LIVE (WIX_LIVE=true + API key + site id): Wix Stores-Reader products query
 * and eCom orders search (both POST query APIs). Read-only. No writes, no payment.
 */

const base = require('../connectorBase');

function isSet(v) { return v !== undefined && v !== null && String(v).trim() !== ''; }
function authHeaders() {
  return {
    'Authorization': process.env.WIX_API_KEY || '',
    'wix-site-id': process.env.WIX_SITE_ID || '',
    'Accept': 'application/json'
  };
}

const WIX = base.createAdapter({
  id: 'wix',
  label: 'Wix Stores',

  isLive: function () {
    return String(process.env.WIX_LIVE || 'false').toLowerCase() === 'true'
      && isSet(process.env.WIX_API_KEY) && isSet(process.env.WIX_SITE_ID);
  },

  keyStatus: function () {
    return {
      WIX_API_KEY: isSet(process.env.WIX_API_KEY) ? 'masked' : 'missing',
      WIX_SITE_ID: isSet(process.env.WIX_SITE_ID) ? 'set' : 'missing'
    };
  },

  fetchProducts: async function () {
    const r = await base.httpPostJson(
      'https://www.wixapis.com/stores-reader/v1/products/query',
      authHeaders(), { query: { paging: { limit: 50 } } }, 9000);
    const list = r.json && Array.isArray(r.json.products) ? r.json.products : null;
    if (!list) throw new Error('wix_products_bad_response_' + (r.status || '?'));
    return list.map(function (p) {
      const pd = p.priceData || p.price || {};
      const stock = p.stock || {};
      return {
        id: String(p.id || ''),
        title: p.name || 'Untitled',
        price: pd.price != null ? Number(pd.price) : (pd.discountedPrice != null ? Number(pd.discountedPrice) : null),
        currency: pd.currency || process.env.WIX_CURRENCY || 'PKR',
        stock: stock.quantity != null ? Number(stock.quantity) : null,
        url: (p.productPageUrl && (p.productPageUrl.base || '') + (p.productPageUrl.path || '')) || null,
        image: (p.media && p.media.mainMedia && p.media.mainMedia.image && p.media.mainMedia.image.url) || null
      };
    });
  },

  fetchOrders: async function () {
    const r = await base.httpPostJson(
      'https://www.wixapis.com/ecom/v1/orders/search',
      authHeaders(), { search: { cursorPaging: { limit: 50 } } }, 9000);
    const list = r.json && Array.isArray(r.json.orders) ? r.json.orders : null;
    if (!list) throw new Error('wix_orders_bad_response_' + (r.status || '?'));
    const byBuyer = {};
    list.forEach(function (o) {
      const bi = (o.billingInfo && o.billingInfo.contactDetails) || {};
      const email = (o.buyerInfo && o.buyerInfo.email) || null;
      const key = (o.buyerInfo && o.buyerInfo.contactId) || email || o.id;
      if (!byBuyer[key]) {
        byBuyer[key] = {
          id: String((o.buyerInfo && o.buyerInfo.contactId) || key),
          name: [bi.firstName, bi.lastName].filter(Boolean).join(' ') || null,
          email: email, phone: bi.phone || null,
          orders: 0, lastOrderAt: null
        };
      }
      byBuyer[key].orders += 1;
      const at = o.createdDate || null;
      if (at && (!byBuyer[key].lastOrderAt || at > byBuyer[key].lastOrderAt)) byBuyer[key].lastOrderAt = at;
    });
    return Object.values(byBuyer);
  },

  sampleProducts: function () {
    return [
      { id: 'WIX-7101', title: 'Wix Sample Hoodie', price: 3499, currency: 'PKR', stock: 30, url: 'https://example.wixsite.com/store/hoodie' },
      { id: 'WIX-7102', title: 'Wix Sample Mug', price: 899, currency: 'PKR', stock: 50, url: 'https://example.wixsite.com/store/mug' }
    ];
  },
  sampleOrders: function () {
    return [
      { id: 'WIXC-8101', name: 'Sample Wix Buyer', email: 'wix@example.com', phone: '03008889999', orders: 1, lastOrderAt: '2026-06-20' }
    ];
  }
});

module.exports = WIX;
