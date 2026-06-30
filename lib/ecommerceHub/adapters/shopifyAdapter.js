'use strict';

/**
 * Ecommerce Hub — Shopify adapter (Phase 1).
 * Dry-run by default: sample data, no network, no keys. Live mode would call
 * the Shopify Admin API; the live calls are clearly-marked stubs in Phase 1.
 * This is also the template to copy for the next platform (Woo, Magento, etc.).
 */

const base = require('../connectorBase');

function isSet(v) { return v !== undefined && v !== null && String(v).trim() !== ''; }

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

  // LIVE fetch stub (Admin API). Implement in Phase 2 behind SHOPIFY_LIVE.
  fetchProducts: async function () {
    throw new Error('shopify_live_not_implemented_phase1');
  },
  fetchOrders: async function () {
    throw new Error('shopify_live_not_implemented_phase1');
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
