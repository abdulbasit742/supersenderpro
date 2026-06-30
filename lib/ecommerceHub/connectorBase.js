'use strict';

/**
 * Ecommerce Hub — connector base (Phase 1).
 * Shared contract + helpers every platform adapter uses. Enforces dry-run,
 * masks PII, and provides timeout-guarded GET/POST. No writes from here.
 */

const https = require('https');
const { URL } = require('url');

function hubDryRun() {
  return String(process.env.ECOMMERCE_HUB_DRY_RUN || 'true').toLowerCase() !== 'false';
}

function maskPhone(v) {
  if (!v) return null;
  const d = String(v).replace(/[^0-9]/g, '');
  if (d.length < 4) return '****';
  return '****' + d.slice(-3);
}
function maskEmail(v) {
  if (!v || String(v).indexOf('@') === -1) return null;
  const p = String(v).split('@');
  const n = p[0];
  return (n.length <= 2 ? '*'.repeat(n.length) : n[0] + '***' + n.slice(-1)) + '@' + p[1];
}

// Normalize any adapter's raw product into one shape.
function normalizeProduct(platform, raw) {
  raw = raw || {};
  return {
    platform: platform,
    id: String(raw.id || raw.sku || ''),
    title: String(raw.title || raw.name || 'Untitled').slice(0, 140),
    price: raw.price != null ? Number(raw.price) : null,
    currency: raw.currency || 'PKR',
    stock: raw.stock != null ? Number(raw.stock) : null,
    url: raw.url || null,
    image: raw.image || null
  };
}

// Normalize any adapter's raw order/client; PII masked.
function normalizeClient(platform, raw) {
  raw = raw || {};
  return {
    platform: platform,
    id: String(raw.id || ''),
    name: raw.name ? String(raw.name).slice(0, 80) : null,
    phoneMasked: maskPhone(raw.phone),
    emailMasked: maskEmail(raw.email),
    orders: raw.orders != null ? Number(raw.orders) : 0,
    lastOrderAt: raw.lastOrderAt || null
  };
}

// Timeout-guarded GET. Adapters only call this when their platform is LIVE.
function httpGetJson(url, headers, timeoutMs) {
  return new Promise(function (resolve, reject) {
    const req = https.get(url, { headers: headers || {}, timeout: timeoutMs || 8000 }, function (res) {
      let data = '';
      res.on('data', function (c) { data += c; if (data.length > 4e6) req.destroy(); });
      res.on('end', function () {
        try { resolve({ status: res.statusCode, json: JSON.parse(data || '{}') }); }
        catch (_e) { resolve({ status: res.statusCode, json: null }); }
      });
    });
    req.on('timeout', function () { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
  });
}

// Timeout-guarded POST (JSON). For query-style read APIs (e.g. Wix). Read-only use.
function httpPostJson(url, headers, bodyObj, timeoutMs) {
  return new Promise(function (resolve, reject) {
    const u = new URL(url);
    const body = typeof bodyObj === 'string' ? bodyObj : JSON.stringify(bodyObj || {});
    const h = Object.assign({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    }, headers || {});
    const req = https.request({
      method: 'POST', hostname: u.hostname, path: u.pathname + (u.search || ''),
      headers: h, timeout: timeoutMs || 9000
    }, function (res) {
      let data = '';
      res.on('data', function (c) { data += c; if (data.length > 4e6) req.destroy(); });
      res.on('end', function () {
        try { resolve({ status: res.statusCode, json: JSON.parse(data || '{}') }); }
        catch (_e) { resolve({ status: res.statusCode, json: null }); }
      });
    });
    req.on('timeout', function () { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
    req.write(body); req.end();
  });
}

/**
 * Adapter contract (each platform implements):
 *   id, label, isLive(), fetchProducts(), fetchOrders(), sampleProducts(), sampleOrders()
 * createAdapter wraps an impl so callers get dry-run + normalization for free.
 */
function createAdapter(impl) {
  return {
    id: impl.id,
    label: impl.label,
    isLive: function () { return !hubDryRun() && impl.isLive(); },
    keyStatus: impl.keyStatus,
    async products() {
      const live = (!hubDryRun() && impl.isLive());
      try {
        const raw = live ? await impl.fetchProducts() : impl.sampleProducts();
        return { ok: true, live: live, products: (raw || []).map(function (p) { return normalizeProduct(impl.id, p); }) };
      } catch (e) {
        return { ok: true, live: false, error: e && e.message, products: impl.sampleProducts().map(function (p) { return normalizeProduct(impl.id, p); }) };
      }
    },
    async clients() {
      const live = (!hubDryRun() && impl.isLive());
      try {
        const raw = live ? await impl.fetchOrders() : impl.sampleOrders();
        return { ok: true, live: live, clients: (raw || []).map(function (c) { return normalizeClient(impl.id, c); }) };
      } catch (e) {
        return { ok: true, live: false, error: e && e.message, clients: impl.sampleOrders().map(function (c) { return normalizeClient(impl.id, c); }) };
      }
    }
  };
}

module.exports = { hubDryRun, maskPhone, maskEmail, normalizeProduct, normalizeClient, httpGetJson, httpPostJson, createAdapter };
