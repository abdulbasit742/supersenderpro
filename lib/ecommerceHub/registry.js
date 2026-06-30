'use strict';

/**
 * Ecommerce Hub — adapter registry (Phase 1).
 * Register every platform adapter here. To add a platform "one by one",
 * require its adapter and add it to ADAPTERS. Everything else is automatic.
 */

const daraz = require('./adapters/darazAdapter');
const shopify = require('./adapters/shopifyAdapter');
const woo = require('./adapters/wooAdapter');
const magento = require('./adapters/magentoAdapter');
const prestashop = require('./adapters/prestashopAdapter');
const generic = require('./adapters/genericRestAdapter');

const ADAPTERS = [daraz, shopify, woo, magento, prestashop, generic];

function list() {
  return ADAPTERS.map(function (a) {
    return {
      id: a.id,
      label: a.label,
      live: a.isLive(),
      keys: typeof a.keyStatus === 'function' ? a.keyStatus() : {}
    };
  });
}

function get(id) {
  const want = String(id || '').toLowerCase();
  return ADAPTERS.find(function (a) { return a.id === want; }) || null;
}

function ids() { return ADAPTERS.map(function (a) { return a.id; }); }

// Aggregate products/clients across ALL registered platforms.
async function allProducts() {
  const out = [];
  for (const a of ADAPTERS) {
    const r = await a.products();
    (r.products || []).forEach(function (p) { out.push(p); });
  }
  return out;
}
async function allClients() {
  const out = [];
  for (const a of ADAPTERS) {
    const r = await a.clients();
    (r.clients || []).forEach(function (c) { out.push(c); });
  }
  return out;
}

module.exports = { list, get, ids, allProducts, allClients, ADAPTERS };
