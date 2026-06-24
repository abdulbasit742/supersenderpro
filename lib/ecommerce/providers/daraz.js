'use strict';

/**
 * providers/daraz.js — Daraz / Lazada Open Platform connector.
 * Auth: app key + app secret + seller access token. Requests are signed with
 * HMAC-SHA256 over the sorted request params (Lazada/Daraz "sign" scheme).
 * Docs: https://open.daraz.com/
 */

const crypto = require('crypto');

// Regional REST gateways.
const REGIONS = {
  pk: 'https://api.daraz.pk/rest',
  bd: 'https://api.daraz.com.bd/rest',
  lk: 'https://api.daraz.lk/rest',
  np: 'https://api.daraz.com.np/rest',
};

function gateway(creds) { return REGIONS[(creds.region || 'pk').toLowerCase()] || REGIONS.pk; }

/** Lazada/Daraz signature: HMAC-SHA256(secret, apiPath + sorted k+v concatenation), hex uppercase. */
function sign(apiPath, params, appSecret) {
  const sorted = Object.keys(params).sort();
  let base = apiPath;
  for (const k of sorted) base += k + params[k];
  return crypto.createHmac('sha256', appSecret).update(base, 'utf8').digest('hex').toUpperCase();
}

function buildParams(creds, apiPath, extra = {}) {
  const params = {
    app_key: String(creds.appKey || ''),
    timestamp: String(Date.now()),
    sign_method: 'sha256',
    access_token: String(creds.accessToken || ''),
    ...extra,
  };
  params.sign = sign(apiPath, params, String(creds.appSecret || ''));
  return params;
}

function validate(creds = {}) {
  if (!creds.appKey || !creds.appSecret) return { ok: false, error: 'appKey and appSecret are required' };
  if (!creds.accessToken) return { ok: false, error: 'access token (seller authorization) is required' };
  return { ok: true };
}

function normalizeProduct(p) {
  const sku = (p.skus && p.skus[0]) || {};
  const attrs = p.attributes || {};
  return {
    externalId: String(p.item_id || sku.SellerSku || ''),
    title: attrs.name || attrs.short_description || '',
    sku: sku.SellerSku || '',
    price: sku.price != null ? Number(sku.price) : null,
    currency: null,
    stock: sku.quantity != null ? Number(sku.quantity) : null,
    image: sku.Images && sku.Images[0] ? sku.Images[0] : (p.images && p.images[0]) || null,
    url: sku.Url || null,
  };
}

function normalizeOrder(o) {
  return {
    externalId: String(o.order_id || o.order_number || ''),
    number: String(o.order_number || o.order_id || ''),
    customerName: [o.customer_first_name, o.customer_last_name].filter(Boolean).join(' ').trim(),
    customerPhone: (o.address_billing && o.address_billing.phone) || (o.address_shipping && o.address_shipping.phone) || '',
    total: o.price != null ? Number(o.price) : null,
    currency: null,
    status: (o.statuses && o.statuses[0]) || 'pending',
    items: [],
    createdAt: o.created_at || null,
  };
}

async function call(creds, http, apiPath, extra) {
  const params = buildParams(creds, apiPath, extra);
  return http({ method: 'GET', url: gateway(creds) + apiPath, params });
}

async function testConnection(creds, http) {
  const { status, data } = await call(creds, http, '/seller/get');
  if (status === 200 && data && (data.code === '0' || data.code === 0)) {
    return { ok: true, info: { name: (data.data && (data.data.name || data.data.short_code)) || 'Daraz seller' } };
  }
  return { ok: false, error: `Daraz returned ${data && data.code ? 'code ' + data.code : 'HTTP ' + status}` };
}

async function fetchProducts(creds, http, opts = {}) {
  const { status, data } = await call(creds, http, '/products/get', { limit: String(opts.limit || 50), offset: '0' });
  if (status !== 200) throw new Error(`Daraz products HTTP ${status}`);
  const products = (data && data.data && data.data.products) || [];
  return products.map(normalizeProduct);
}

async function fetchOrders(creds, http, opts = {}) {
  const since = new Date(Date.now() - 30 * 864e5).toISOString();
  const { status, data } = await call(creds, http, '/orders/get', { limit: String(opts.limit || 50), offset: '0', created_after: since, sort_direction: 'DESC' });
  if (status !== 200) throw new Error(`Daraz orders HTTP ${status}`);
  const orders = (data && data.data && data.data.orders) || [];
  return orders.map(normalizeOrder);
}

module.exports = {
  id: 'daraz', label: 'Daraz',
  credentialFields: [
    { key: 'appKey', label: 'App key', secret: true },
    { key: 'appSecret', label: 'App secret', secret: true },
    { key: 'accessToken', label: 'Seller access token', secret: true },
    { key: 'region', label: 'Region (pk/bd/lk/np)', placeholder: 'pk' },
  ],
  validate, testConnection, fetchProducts, fetchOrders, normalizeProduct, normalizeOrder, sign,
};
