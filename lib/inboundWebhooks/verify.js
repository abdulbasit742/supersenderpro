// lib/inboundWebhooks/verify.js — Verify an incoming request against an endpoint's scheme.
// hmac_sha256: signature header = HMAC-SHA256(secret, rawBody) hex (optionally with a timestamp
// prefix '<ts>.' to match providers like Stripe). token: a shared header value compared in
// constant time. unsigned: accepted only if the endpoint is explicitly marked unsigned.

const crypto = require('crypto');

function _timingSafeEq(a, b) {
 const ba = Buffer.from(String(a || '')); const bb = Buffer.from(String(b || ''));
 if (ba.length !== bb.length) return false;
 try { return crypto.timingSafeEqual(ba, bb); } catch (_e) { return false; }
}

function hmacSha256(secret, rawBody, timestamp) {
 const base = timestamp ? `${timestamp}.${rawBody}` : String(rawBody);
 return crypto.createHmac('sha256', String(secret)).update(base).digest('hex');
}

// endpoint: { scheme, secret, signatureHeader, timestampHeader }. headers: lowercased map.
function verify(endpoint, rawBody, headers = {}) {
 const scheme = endpoint.scheme || 'hmac_sha256';
 if (scheme === 'unsigned') return { verified: true, scheme };
 if (scheme === 'token') {
 const presented = headers[(endpoint.signatureHeader || 'x-webhook-token').toLowerCase()];
 return { verified: _timingSafeEq(presented, endpoint.secret), scheme, reason: 'token compare' };
 }
 // hmac_sha256
 const sigHeader = (endpoint.signatureHeader || 'x-signature').toLowerCase();
 const presented = headers[sigHeader];
 if (!presented) return { verified: false, scheme, reason: 'missing signature header' };
 const ts = endpoint.timestampHeader ? headers[endpoint.timestampHeader.toLowerCase()] : null;
 const expected = hmacSha256(endpoint.secret, rawBody, ts);
 // Allow the provider to prefix/wrap the hex (e.g. 'sha256=...'); compare on the hex tail.
 const presentedHex = String(presented).replace(/^.*?=/, '').trim();
 return { verified: _timingSafeEq(presentedHex, expected) || _timingSafeEq(presented, expected), scheme, reason: 'hmac compare' };
}

module.exports = { verify, hmacSha256 };
