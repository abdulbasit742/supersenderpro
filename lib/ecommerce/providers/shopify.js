'use strict';

/**
 * providers/shopify.js — Shopify Admin REST API connector.
 * Auth: store URL + Admin API access token (header X-Shopify-Access-Token).
 * Docs: https://shopify.dev/docs/api/admin-rest
 */

const API_VERSION = '2024-01';

function baseUrl(creds) {
  let shop = String(creds.shopUrl || '').trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (shop && !shop.includes('.')) shop += '.myshopify.com';
  return `https://${shop}/admin/api/${API_VERSION}`;
}

function headers(creds) {
  return { 'X-Shopify-Access-Token': String(creds.accessToken || ''), 'Content-Type': 'application/json' };
}

function validate(creds = {}) {
  if (!creds.shopUrl) return { ok: false, error: 'shopUrl is required (e.g. mystore or mystore.myshopify.com)' };
  if (!creds.accessToken) return { ok: false, error: 'accessToken (Admin API token) is required' };
  return { ok: true };
}

function normalizeProduct(p) {
  const v = (p.variants && p.variants[0]) || {};
  return {
    externalId: String(p.id),
    title: p.title,
    sku: v.sku || '',
    price: v.price != null ? Number(v.price) : null,
    currency: null, // shop currency comes from shop settings
    stock: v.inventory_quantity != null ? v.inventory_quantity : null,
    image: (p.image && p.image.src) || (p.images && p.images[0] && p.images[0].src) || null,
    url: null,
  };
}

function normalizeOrder(o) {
  return {
    externalId: String(o.id),
    number: o.name || String(o.order_number || o.id),
    customerName: [o.customer && o.customer.first_name, o.customer && o.customer.last_name].filter(Boolean).join(' ').trim() || (o.billing_address && o.billing_address.name) || '',
    customerPhone: (o.customer && o.customer.phone) || (o.billing_address && o.billing_address.phone) || (o.shipping_address && o.shipping_address.phone) || '',
    total: o.total_price != null ? Number(o.total_price) : null,
    currency: o.currency || null,
    status: o.financial_status || o.fulfillment_status || 'pending',
    items: (o.line_items || []).map((li) => ({ title: li.title, qty: li.quantity, price: Number(li.price) })),
    createdAt: o.created_at || null,
  };
}

async function testConnection(creds, http) {
  const { status, data } = await http({ method: 'GET', url: `${baseUrl(creds)}/shop.json`, headers: headers(creds) });
  if (status === 200 && data && data.shop) return { ok: true, info: { name: data.shop.name, domain: data.shop.domain, currency: data.shop.currency } };
  return { ok: false, error: `Shopify returned HTTP ${status}` };
}

async function fetchProducts(creds, http, opts = {}) {
  const { status, data } = await http({ method: 'GET', url: `${baseUrl(creds)}/products.json`, headers: headers(creds), params: { limit: opts.limit || 50 } });
  if (status !== 200) throw new Error(`Shopify products HTTP ${status}`);
  return (data.products || []).map(normalizeProduct);
}

async function fetchOrders(creds, http, opts = {}) {
  const { status, data } = await http({ method: 'GET', url: `${baseUrl(creds)}/orders.json`, headers: headers(creds), params: { limit: opts.limit || 50, status: 'any' } });
  if (status !== 200) throw new Error(`Shopify orders HTTP ${status}`);
  return (data.orders || []).map(normalizeOrder);
}

module.exports = {
  id: 'shopify', label: 'Shopify',
  credentialFields: [
    { key: 'shopUrl', label: 'Store URL', placeholder: 'mystore.myshopify.com' },
    { key: 'accessToken', label: 'Admin API access token', secret: true },
  ],
  validate, testConnection, fetchProducts, fetchOrders, normalizeProduct, normalizeOrder,
};
