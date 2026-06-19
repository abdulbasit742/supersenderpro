'use strict';

/**
 * providers/woocommerce.js — WooCommerce REST API v3 connector.
 * Auth: store URL + consumer key + consumer secret (HTTP Basic).
 * Docs: https://woocommerce.github.io/woocommerce-rest-api-docs/
 */

function baseUrl(creds) {
  const url = String(creds.storeUrl || '').trim().replace(/\/$/, '');
  return `${url}/wp-json/wc/v3`;
}
function auth(creds) {
  return { username: String(creds.consumerKey || ''), password: String(creds.consumerSecret || '') };
}

function validate(creds = {}) {
  if (!creds.storeUrl) return { ok: false, error: 'storeUrl is required (e.g. https://mystore.com)' };
  if (!creds.consumerKey || !creds.consumerSecret) return { ok: false, error: 'consumerKey and consumerSecret are required' };
  return { ok: true };
}

function normalizeProduct(p) {
  return {
    externalId: String(p.id),
    title: p.name,
    sku: p.sku || '',
    price: p.price != null && p.price !== '' ? Number(p.price) : null,
    currency: null,
    stock: p.stock_quantity != null ? p.stock_quantity : null,
    image: (p.images && p.images[0] && p.images[0].src) || null,
    url: p.permalink || null,
  };
}

function normalizeOrder(o) {
  const b = o.billing || {};
  return {
    externalId: String(o.id),
    number: String(o.number || o.id),
    customerName: [b.first_name, b.last_name].filter(Boolean).join(' ').trim(),
    customerPhone: b.phone || '',
    total: o.total != null ? Number(o.total) : null,
    currency: o.currency || null,
    status: o.status || 'pending',
    items: (o.line_items || []).map((li) => ({ title: li.name, qty: li.quantity, price: Number(li.price) })),
    createdAt: o.date_created || null,
  };
}

async function testConnection(creds, http) {
  const { status, data } = await http({ method: 'GET', url: `${baseUrl(creds)}/system_status`, auth: auth(creds) });
  if (status === 200) {
    const env = (data && data.environment) || {};
    return { ok: true, info: { name: env.site_title || creds.storeUrl, wc: env.version } };
  }
  // Fallback: many stores restrict system_status; try a lightweight products call.
  const p = await http({ method: 'GET', url: `${baseUrl(creds)}/products`, auth: auth(creds), params: { per_page: 1 } });
  if (p.status === 200) return { ok: true, info: { name: creds.storeUrl } };
  return { ok: false, error: `WooCommerce returned HTTP ${status}` };
}

async function fetchProducts(creds, http, opts = {}) {
  const { status, data } = await http({ method: 'GET', url: `${baseUrl(creds)}/products`, auth: auth(creds), params: { per_page: opts.limit || 50 } });
  if (status !== 200) throw new Error(`WooCommerce products HTTP ${status}`);
  return (data || []).map(normalizeProduct);
}

async function fetchOrders(creds, http, opts = {}) {
  const { status, data } = await http({ method: 'GET', url: `${baseUrl(creds)}/orders`, auth: auth(creds), params: { per_page: opts.limit || 50 } });
  if (status !== 200) throw new Error(`WooCommerce orders HTTP ${status}`);
  return (data || []).map(normalizeOrder);
}

module.exports = {
  id: 'woocommerce', label: 'WooCommerce',
  credentialFields: [
    { key: 'storeUrl', label: 'Store URL', placeholder: 'https://mystore.com' },
    { key: 'consumerKey', label: 'Consumer key', secret: true },
    { key: 'consumerSecret', label: 'Consumer secret', secret: true },
  ],
  validate, testConnection, fetchProducts, fetchOrders, normalizeProduct, normalizeOrder,
};
