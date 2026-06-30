'use strict';

/**
 * Ecommerce Hub — Daraz adapter (Phase 1, priority platform).
 * Dry-run by default: returns sample products/orders, NO network call, NO keys.
 * Live mode (DARAZ_LIVE=true + hub live) would call the Daraz Open Platform API;
 * that call is left as a clearly-marked stub so nothing fake is reported.
 */

const base = require('../connectorBase');

function isSet(v) { return v !== undefined && v !== null && String(v).trim() !== ''; }

const DARAZ = base.createAdapter({
  id: 'daraz',
  label: 'Daraz',

  isLive: function () {
    return String(process.env.DARAZ_LIVE || 'false').toLowerCase() === 'true'
      && isSet(process.env.DARAZ_APP_KEY) && isSet(process.env.DARAZ_APP_SECRET);
  },

  keyStatus: function () {
    return {
      DARAZ_APP_KEY: isSet(process.env.DARAZ_APP_KEY) ? 'masked' : 'missing',
      DARAZ_APP_SECRET: isSet(process.env.DARAZ_APP_SECRET) ? 'masked' : 'missing',
      DARAZ_SELLER_REGION: process.env.DARAZ_SELLER_REGION || 'pk'
    };
  },

  // LIVE fetch stub. Phase 1 ships no signed Daraz client, so we refuse rather
  // than fake a real response. Implement signing in Phase 2 behind DARAZ_LIVE.
  fetchProducts: async function () {
    throw new Error('daraz_live_not_implemented_phase1');
  },
  fetchOrders: async function () {
    throw new Error('daraz_live_not_implemented_phase1');
  },

  sampleProducts: function () {
    return [
      { id: 'DRZ-1001', title: 'Wireless Earbuds Pro', price: 2499, currency: 'PKR', stock: 42, url: 'https://www.daraz.pk/products/DRZ-1001' },
      { id: 'DRZ-1002', title: 'Smart Watch Series 6', price: 5999, currency: 'PKR', stock: 7, url: 'https://www.daraz.pk/products/DRZ-1002' },
      { id: 'DRZ-1003', title: 'USB-C Fast Charger 30W', price: 1299, currency: 'PKR', stock: 0, url: 'https://www.daraz.pk/products/DRZ-1003' }
    ];
  },
  sampleOrders: function () {
    return [
      { id: 'C-9001', name: 'Sample Buyer A', phone: '03001234567', orders: 3, lastOrderAt: '2026-06-19' },
      { id: 'C-9002', name: 'Sample Buyer B', phone: '03007654321', orders: 1, lastOrderAt: '2026-06-20' }
    ];
  }
});

module.exports = DARAZ;
