'use strict';

/**
 * lib/ecommerceManager.js — orchestrates the e-commerce connection lifecycle:
 * connect (validate + live test + persist), re-test, sync products, fetch
 * orders, and fire WhatsApp order confirmations through the existing
 * template + spintax engine. HTTP is injectable for offline testing.
 */

const registry = require('./ecommerce/index');
const store = require('./ecommerceStore');
const { defaultHttp } = require('./ecommerce/http');

let templates = null;
let spintax = null;
try { templates = require('./templateStore'); } catch (_) {}
try { spintax = require('./spintax'); } catch (_) {}

function listPlatforms() { return registry.listProviders(); }

/** Validate + live-test credentials, then persist the connection. */
async function connect(platform, credentials, http = defaultHttp) {
  const provider = registry.getProvider(platform);
  if (!provider) throw new Error(`unknown platform: ${platform}`);
  const v = provider.validate(credentials || {});
  if (!v.ok) return { ok: false, error: v.error };

  let test;
  try { test = await provider.testConnection(credentials, http); }
  catch (e) { return { ok: false, error: 'connection test failed: ' + e.message }; }
  if (!test.ok) return { ok: false, error: test.error || 'connection test failed' };

  const conn = store.createConnection({
    platform: provider.id,
    label: (test.info && test.info.name) || provider.label,
    credentials,
    status: 'connected',
    info: test.info || {},
  });
  return { ok: true, connection: store.redact(conn) };
}

async function testConnection(connectionId, http = defaultHttp) {
  const conn = store.getConnection(connectionId);
  if (!conn) return { ok: false, error: 'connection not found' };
  const provider = registry.getProvider(conn.platform);
  if (!provider) return { ok: false, error: 'provider missing' };
  try {
    const test = await provider.testConnection(conn.credentials, http);
    store.updateConnection(connectionId, { status: test.ok ? 'connected' : 'error', info: test.info || conn.info });
    return test;
  } catch (e) {
    store.updateConnection(connectionId, { status: 'error' });
    return { ok: false, error: e.message };
  }
}

async function syncProducts(connectionId, http = defaultHttp, opts = {}) {
  const conn = store.getConnection(connectionId);
  if (!conn) return { ok: false, error: 'connection not found' };
  const provider = registry.getProvider(conn.platform);
  const products = await provider.fetchProducts(conn.credentials, http, opts);
  store.updateConnection(connectionId, { products, lastSyncAt: new Date().toISOString() });
  return { ok: true, count: products.length, products };
}

async function fetchOrders(connectionId, http = defaultHttp, opts = {}) {
  const conn = store.getConnection(connectionId);
  if (!conn) return { ok: false, error: 'connection not found' };
  const provider = registry.getProvider(conn.platform);
  const orders = await provider.fetchOrders(conn.credentials, http, opts);
  store.updateConnection(connectionId, { orders });
  return { ok: true, count: orders.length, orders };
}

/** Build an order-confirmation message (template-aware) and optionally send it. */
async function sendOrderConfirmation(order, deps = {}) {
  const vars = {
    name: order.customerName || 'there',
    order_number: order.number,
    total: order.total,
    currency: order.currency || '',
    items: (order.items || []).map((i) => `${i.qty}x ${i.title}`).join(', '),
  };
  const body = deps.templateId && templates
    ? (templates.getTemplate(deps.templateId) || {}).body
    : (deps.body || 'Hi {{name}}! Your order {{order_number}} is confirmed. Total: {{currency}} {{total}}. Items: {{items}}. Thank you! 🎉');
  const message = spintax ? spintax.render(body || '', vars) : String(body || '');
  let sent = false;
  if (typeof deps.sendMessage === 'function' && order.customerPhone) {
    await deps.sendMessage(order.customerPhone, message);
    sent = true;
  }
  return { ok: true, sent, message, to: order.customerPhone || null };
}

function disconnect(connectionId) {
  return store.deleteConnection(connectionId);
}

module.exports = {
  listPlatforms, connect, testConnection, syncProducts,
  fetchOrders, sendOrderConfirmation, disconnect,
};
