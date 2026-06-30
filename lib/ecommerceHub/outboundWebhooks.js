'use strict';

/**
 * Ecommerce Hub — outbound webhooks.
 * Fire your own systems (CRM, sheets, n8n, Slack) when hub events happen:
 * order, shipment, return, etc. Targets come from OUTBOUND_WEBHOOKS env JSON
 * array of URLs. POSTs the event JSON. Dry-run safe: if disabled, just returns
 * the payload it would have sent.
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

function enabled() { return String(process.env.OUTBOUND_WEBHOOKS_ENABLED || 'false').toLowerCase() === 'true'; }
function targets() { try { const t = JSON.parse(process.env.OUTBOUND_WEBHOOKS || '[]'); return Array.isArray(t) ? t : []; } catch (_e) { return []; } }

function postOne(url, payload) {
  return new Promise(function (resolve) {
    let u; try { u = new URL(url); } catch (_e) { return resolve({ url: url, ok: false, error: 'bad_url' }); }
    const body = JSON.stringify(payload || {});
    const lib = u.protocol === 'http:' ? http : https;
    const req = lib.request({ method: 'POST', hostname: u.hostname, port: u.port || undefined, path: u.pathname + (u.search || ''), headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }, timeout: 8000 }, function (res) {
      res.on('data', function () {}); res.on('end', function () { resolve({ url: url, ok: res.statusCode < 400, status: res.statusCode }); });
    });
    req.on('timeout', function () { req.destroy(); resolve({ url: url, ok: false, error: 'timeout' }); });
    req.on('error', function (e) { resolve({ url: url, ok: false, error: e && e.message }); });
    req.write(body); req.end();
  });
}

async function emit(event, data) {
  const payload = { event: String(event || 'event'), data: data || {}, at: new Date().toISOString() };
  if (!enabled() || !targets().length) return { ok: true, dryRun: true, payload: payload, targets: targets().length };
  const results = [];
  for (const url of targets()) results.push(await postOne(url, payload));
  return { ok: true, payload: payload, results: results };
}

module.exports = { emit, enabled, targets };
