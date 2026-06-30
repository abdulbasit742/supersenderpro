'use strict';
/**
 * lib/webhooks/signedDelivery.js - deliver outbound webhooks with an HMAC signature + retries.
 *
 * Receivers verify authenticity by recomputing the signature over `${timestamp}.${body}` with
 * the shared secret (same scheme Stripe uses). This makes our outbound events trustworthy.
 *
 * - sign(payload, secret, ts) -> header value 't=<ts>,v1=<hex>'
 * - verify(rawBody, header, secret, toleranceSec) -> bool (for tests / receiver examples)
 * - deliver(url, payload, { secret, retries, dryRun }) -> { ok, status, attempts, signature }
 *
 * Safe: dryRun (default when no global fetch) computes + returns the signature without sending.
 */
const crypto = require('crypto');

function sign(payload, secret, ts = Math.floor(Date.now() / 1000)) {
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const mac = crypto.createHmac('sha256', String(secret || '')).update(ts + '.' + body).digest('hex');
  return { header: 't=' + ts + ',v1=' + mac, ts, body };
}

function verify(rawBody, header, secret, toleranceSec = 300) {
  try {
    const parts = Object.fromEntries(String(header || '').split(',').map((kv) => kv.split('=')));
    if (!parts.t || !parts.v1) return false;
    if (toleranceSec && Math.abs(Math.floor(Date.now() / 1000) - Number(parts.t)) > toleranceSec) return false;
    const expected = crypto.createHmac('sha256', String(secret || '')).update(parts.t + '.' + (Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody)).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(parts.v1), Buffer.from(expected));
  } catch { return false; }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function deliver(url, payload, { secret = '', retries = 3, baseDelayMs = 300, dryRun, headers = {}, timeoutMs = 8000 } = {}) {
  const { header, body } = sign(payload, secret);
  const isDry = dryRun !== undefined ? dryRun : (typeof fetch !== 'function');
  if (isDry) return { ok: true, dryRun: true, status: 0, attempts: 0, signature: header, body };
  let attempts = 0; let lastErr = null;
  for (let i = 0; i <= retries; i++) {
    attempts++;
    try {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), timeoutMs);
      const res = await fetch(url, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json', 'X-Signature': header, 'X-Webhook-Timestamp': String(Math.floor(Date.now() / 1000)) }, headers), body, signal: ctrl.signal });
      clearTimeout(to);
      if (res.ok) return { ok: true, status: res.status, attempts, signature: header };
      if (res.status < 500) return { ok: false, status: res.status, attempts, signature: header }; // don't retry 4xx
      lastErr = new Error('HTTP ' + res.status);
    } catch (e) { lastErr = e; }
    if (i < retries) await sleep(baseDelayMs * Math.pow(2, i)); // exponential backoff
  }
  return { ok: false, status: 0, attempts, error: lastErr && lastErr.message, signature: header };
}

module.exports = { sign, verify, deliver };
