'use strict';

/**
 * Ecommerce Hub — Daraz adapter (LIVE-signed, read + safe write).
 * Dry-run by default: sample data, no network, no keys.
 * LIVE (DARAZ_LIVE=true + hub live + creds): calls the Daraz Open Platform API
 * with the required HMAC-SHA256 request signing.
 *   - READ: products + orders (always allowed when live)
 *   - WRITE: updatePriceQuantity() — stock/price only, no payment, no delete.
 *     Exposed to WhatsApp admins via adminCommands.js, never to customers.
 *
 * Daraz signing: sort all params (incl. common, excl. `sign`) by key,
 * concatenate as <api_path> + key+value pairs, HMAC-SHA256 with app secret,
 * hex upper-case. Token comes from the seller OAuth flow.
 */

const crypto = require('crypto');
const https = require('https');
const { URL } = require('url');
const base = require('../connectorBase');

function isSet(v) { return v !== undefined && v !== null && String(v).trim() !== ''; }

function gatewayBase() {
  const region = String(process.env.DARAZ_SELLER_REGION || 'pk').toLowerCase();
  const hosts = {
    pk: 'https://api.daraz.pk/rest',
    bd: 'https://api.daraz.com.bd/rest',
    lk: 'https://api.daraz.lk/rest',
    np: 'https://api.daraz.com.np/rest',
    mm: 'https://api.shop.com.mm/rest'
  };
  return process.env.DARAZ_API_BASE || hosts[region] || hosts.pk;
}

// Build signed param object for a given API path + business params.
function signParams(apiPath, params) {
  const appKey = process.env.DARAZ_APP_KEY || '';
  const appSecret = process.env.DARAZ_APP_SECRET || '';
  const token = process.env.DARAZ_ACCESS_TOKEN || '';

  const common = {
    app_key: appKey,
    timestamp: String(Date.now()),
    sign_method: 'sha256',
    access_token: token
  };
  const all = Object.assign({}, common, params || {});

  const keys = Object.keys(all).filter(function (k) { return k !== 'sign'; }).sort();
  let toSign = apiPath;
  keys.forEach(function (k) { toSign += k + all[k]; });

  all.sign = crypto.createHmac('sha256', appSecret).update(toSign, 'utf8').digest('hex').toUpperCase();
  return all;
}

function toQuery(all) {
  return Object.keys(all).map(function (k) {
    return encodeURIComponent(k) + '=' + encodeURIComponent(all[k]);
  }).join('&');
}

async function callDarazGet(apiPath, params) {
  const url = gatewayBase() + apiPath + '?' + toQuery(signParams(apiPath, params));
  const r = await base.httpGetJson(url, { 'Accept': 'application/json' }, 9000);
  if (!r.json) throw new Error('daraz_bad_response_' + (r.status || '?'));
  if (r.json.code && String(r.json.code) !== '0') {
    throw new Error('daraz_api_error_' + r.json.code + (r.json.message ? '_' + r.json.message : ''));
  }
  return r.json;
}

// Signed POST (form-encoded). Used only for the price/quantity write.
function callDarazPost(apiPath, params) {
  return new Promise(function (resolve, reject) {
    const body = toQuery(signParams(apiPath, params));
    const u = new URL(gatewayBase() + apiPath);
    const req = https.request({
      method: 'POST', hostname: u.hostname, path: u.pathname,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
        'Accept': 'application/json'
      }, timeout: 9000
    }, function (res) {
      let data = '';
      res.on('data', function (c) { data += c; });
      res.on('end', function () {
        let json = null; try { json = JSON.parse(data || '{}'); } catch (_e) {}
        if (!json) return reject(new Error('daraz_bad_response_' + (res.statusCode || '?')));
        if (json.code && String(json.code) !== '0') return reject(new Error('daraz_api_error_' + json.code + (json.message ? '_' + json.message : '')));
        resolve(json);
      });
    });
    req.on('timeout', function () { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
    req.write(body); req.end();
  });
}

// Build the Daraz UpdatePriceQuantity payload XML for one SKU.
function priceQtyPayload(sellerSku, opts) {
  let sku = '<Sku><SellerSku>' + String(sellerSku) + '</SellerSku>';
  if (opts.price != null) sku += '<Price>' + Number(opts.price) + '</Price>';
  if (opts.quantity != null) sku += '<Quantity>' + Number(opts.quantity) + '</Quantity>';
  sku += '</Sku>';
  return '<Request><Product><Skus>' + sku + '</Skus></Product></Request>';
}

const DARAZ = base.createAdapter({
  id: 'daraz',
  label: 'Daraz',

  isLive: function () {
    return String(process.env.DARAZ_LIVE || 'false').toLowerCase() === 'true'
      && isSet(process.env.DARAZ_APP_KEY)
      && isSet(process.env.DARAZ_APP_SECRET)
      && isSet(process.env.DARAZ_ACCESS_TOKEN);
  },

  keyStatus: function () {
    return {
      DARAZ_APP_KEY: isSet(process.env.DARAZ_APP_KEY) ? 'masked' : 'missing',
      DARAZ_APP_SECRET: isSet(process.env.DARAZ_APP_SECRET) ? 'masked' : 'missing',
      DARAZ_ACCESS_TOKEN: isSet(process.env.DARAZ_ACCESS_TOKEN) ? 'masked' : 'missing',
      DARAZ_SELLER_REGION: process.env.DARAZ_SELLER_REGION || 'pk'
    };
  },

  // LIVE: products via /products/get
  fetchProducts: async function () {
    const json = await callDarazGet('/products/get', { filter: 'all', limit: '50', offset: '0' });
    const list = (json.data && (json.data.products || json.data)) || [];
    return (Array.isArray(list) ? list : []).map(function (p) {
      const sku = (p.skus && p.skus[0]) || {};
      return {
        id: String(p.item_id || sku.SellerSku || ''),
        title: (p.attributes && p.attributes.name) || p.name || 'Untitled',
        price: sku.price != null ? Number(sku.price) : null,
        currency: process.env.DARAZ_CURRENCY || 'PKR',
        stock: sku.quantity != null ? Number(sku.quantity) : null,
        url: sku.Url || null,
        image: (p.images && p.images[0]) || null
      };
    });
  },

  // LIVE: orders via /orders/get -> masked client rows
  fetchOrders: async function () {
    const since = new Date(Date.now() - 30 * 864e5).toISOString();
    const json = await callDarazGet('/orders/get', { created_after: since, limit: '50', offset: '0', sort_by: 'created_at', sort_direction: 'DESC' });
    const orders = (json.data && (json.data.orders || json.data)) || [];
    const byBuyer = {};
    (Array.isArray(orders) ? orders : []).forEach(function (o) {
      const key = o.customer_first_name ? (o.customer_first_name + '|' + (o.address_billing && o.address_billing.phone)) : String(o.order_id);
      if (!byBuyer[key]) {
        byBuyer[key] = {
          id: String(o.order_id || key),
          name: [o.customer_first_name, o.customer_last_name].filter(Boolean).join(' ') || null,
          phone: (o.address_billing && o.address_billing.phone) || null,
          email: null,
          orders: 0, lastOrderAt: null
        };
      }
      byBuyer[key].orders += 1;
      const at = o.created_at || null;
      if (at && (!byBuyer[key].lastOrderAt || at > byBuyer[key].lastOrderAt)) byBuyer[key].lastOrderAt = at;
    });
    return Object.values(byBuyer);
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

// --- Safe WRITE (stock/price only). Called by adminCommands, never customers. ---
// In dry-run, returns a simulated result so WhatsApp flow can be tested without keys.
DARAZ.updatePriceQuantity = async function (sellerSku, opts) {
  opts = opts || {};
  if (!isSet(sellerSku)) throw new Error('seller_sku_required');
  if (opts.price == null && opts.quantity == null) throw new Error('nothing_to_update');

  if (base.hubDryRun() || !DARAZ.isLive()) {
    return { ok: true, live: false, dryRun: true, sellerSku: sellerSku, applied: opts, note: 'dry-run: not sent to Daraz' };
  }
  const payload = priceQtyPayload(sellerSku, opts);
  const json = await callDarazPost('/product/price_quantity/update', { payload: payload });
  return { ok: true, live: true, sellerSku: sellerSku, applied: opts, daraz: json && json.data ? json.data : json };
};

module.exports = DARAZ;
