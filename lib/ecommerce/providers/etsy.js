'use strict';

/**
 * providers/etsy.js — Etsy Open API v3 connector.
 * Auth: API key (x-api-key) + OAuth2 access token (Bearer) + shop id.
 * Docs: https://developers.etsy.com/documentation/
 */

const BASE = 'https://openapi.etsy.com/v3/application';

function headers(creds) {
  return { 'x-api-key': String(creds.apiKey || ''), Authorization: `Bearer ${String(creds.accessToken || '')}` };
}
function validate(creds = {}) {
  if (!creds.apiKey) return { ok: false, error: 'apiKey is required' };
  if (!creds.accessToken) return { ok: false, error: 'OAuth access token is required' };
  if (!creds.shopId) return { ok: false, error: 'shopId is required' };
  return { ok: true };
}

function normalizeProduct(l) {
  const price = l.price && l.price.amount != null ? l.price.amount / (l.price.divisor || 100) : null;
  return {
    externalId: String(l.listing_id),
    title: l.title,
    sku: (l.skus && l.skus[0]) || '',
    price,
    currency: (l.price && l.price.currency_code) || null,
    stock: l.quantity != null ? l.quantity : null,
    image: null,
    url: l.url || null,
  };
}
function normalizeOrder(r) {
  return {
    externalId: String(r.receipt_id),
    number: String(r.receipt_id),
    customerName: r.name || '',
    customerPhone: '',
    total: r.grandtotal && r.grandtotal.amount != null ? r.grandtotal.amount / (r.grandtotal.divisor || 100) : null,
    currency: (r.grandtotal && r.grandtotal.currency_code) || null,
    status: r.status || (r.is_paid ? 'paid' : 'pending'),
    items: (r.transactions || []).map((t) => ({ title: t.title, qty: t.quantity, price: t.price && t.price.amount != null ? t.price.amount / (t.price.divisor || 100) : null })),
    createdAt: r.create_timestamp ? new Date(r.create_timestamp * 1000).toISOString() : null,
  };
}

async function testConnection(creds, http) {
  const { status, data } = await http({ method: 'GET', url: `${BASE}/shops/${encodeURIComponent(creds.shopId)}`, headers: headers(creds) });
  if (status === 200 && data) return { ok: true, info: { name: data.shop_name || `shop ${creds.shopId}` } };
  return { ok: false, error: `Etsy returned HTTP ${status}` };
}
async function fetchProducts(creds, http, opts = {}) {
  const { status, data } = await http({ method: 'GET', url: `${BASE}/shops/${encodeURIComponent(creds.shopId)}/listings/active`, headers: headers(creds), params: { limit: opts.limit || 50 } });
  if (status !== 200) throw new Error(`Etsy products HTTP ${status}`);
  return ((data && data.results) || []).map(normalizeProduct);
}
async function fetchOrders(creds, http, opts = {}) {
  const { status, data } = await http({ method: 'GET', url: `${BASE}/shops/${encodeURIComponent(creds.shopId)}/receipts`, headers: headers(creds), params: { limit: opts.limit || 50 } });
  if (status !== 200) throw new Error(`Etsy orders HTTP ${status}`);
  return ((data && data.results) || []).map(normalizeOrder);
}

module.exports = {
  id: 'etsy', label: 'Etsy',
  credentialFields: [
    { key: 'apiKey', label: 'API key (keystring)', secret: true },
    { key: 'accessToken', label: 'OAuth access token', secret: true },
    { key: 'shopId', label: 'Shop ID' },
  ],
  validate, testConnection, fetchProducts, fetchOrders, normalizeProduct, normalizeOrder,
};
