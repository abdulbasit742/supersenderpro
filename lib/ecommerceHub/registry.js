'use strict';

/**
 * Ecommerce Hub — adapter registry.
 * Top 10 platforms + Generic REST. Add a platform by requiring its adapter
 * and pushing it into ADAPTERS. Everything else (dashboard, routes, WhatsApp)
 * is automatic.
 */

const daraz = require('./adapters/darazAdapter');
const shopify = require('./adapters/shopifyAdapter');
const woo = require('./adapters/wooAdapter');
const magento = require('./adapters/magentoAdapter');
const bigcommerce = require('./adapters/bigcommerceAdapter');
const prestashop = require('./adapters/prestashopAdapter');
const opencart = require('./adapters/opencartAdapter');
const wix = require('./adapters/wixAdapter');
const squarespace = require('./adapters/squarespaceAdapter');
const ecwid = require('./adapters/ecwidAdapter');
const generic = require('./adapters/genericRestAdapter');

const ADAPTERS = [daraz, shopify, woo, magento, bigcommerce, prestashop, opencart, wix, squarespace, ecwid, generic];

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
