#!/usr/bin/env node
// tests/smoke/inboundWebhooksSmoke.js — Smoke test for token scheme + mapping + unsigned. Run: npm run inbound-webhooks:smoke

const iw = require('../../lib/inboundWebhooks');

let fails = 0;
function t(cond, msg) { console.log((cond ? 'ok   ' : 'FAIL ') + '- ' + msg); if (!cond) fails++; }

(async () => {
 t(!!iw.ingestEngine, 'engine present');

 // token scheme: header value must match the secret.
 const tok = iw.endpointStore.create({ source: 'zapier', scheme: 'token', signatureHeader: 'x-webhook-token', mapping: { event: 'zap.fired', fields: { contact: 'phone' } } });
 const body = JSON.stringify({ phone: '+923009998877' });
 const okTok = await iw.ingestEngine.ingest(tok.endpoint.slug, body, { 'x-webhook-token': tok.secret });
 t(okTok.status === 200 && okTok.event === 'zap.fired', 'token scheme accepts the right token + maps a literal event');
 const badTok = await iw.ingestEngine.ingest(tok.endpoint.slug, body, { 'x-webhook-token': 'wrong' });
 t(badTok.status === 401, 'token scheme rejects a wrong token');

 // unsigned endpoint accepts without a signature (explicit opt-in only).
 const uns = iw.endpointStore.create({ source: 'internal', scheme: 'unsigned', mapping: { event: 'internal.ping' } });
 const okUns = await iw.ingestEngine.ingest(uns.endpoint.slug, '{}', {});
 t(okUns.status === 200 && okUns.event === 'internal.ping', 'unsigned endpoint accepts when explicitly configured');

 // mapper: array index + default.
 const m = iw.mapper.apply({ event: 'x', fields: { first: 'items.0.sku', tier: { path: 'meta.tier', default: 'standard' } } }, { items: [{ sku: 'ABC' }], meta: {} });
 t(m.first === 'ABC' && m.tier === 'standard', 'mapper reads array index + applies default');

 // HMAC with timestamp prefix (Stripe-style).
 const hp = iw.endpointStore.create({ source: 'stripe', scheme: 'hmac_sha256', signatureHeader: 'stripe-signature', timestampHeader: 'x-ts', mapping: { event: { path: 'type' } } });
 const b2 = JSON.stringify({ id: 'evt_2', type: 'invoice.paid' });
 const ts = '1730000000';
 const sig = iw.verify.hmacSha256(hp.secret, b2, ts);
 const okHp = await iw.ingestEngine.ingest(hp.endpoint.slug, b2, { 'stripe-signature': 'v1=' + sig, 'x-ts': ts });
 t(okHp.status === 200 && okHp.event === 'invoice.paid', 'timestamped HMAC (with v1= prefix) verifies');

 const ov = iw.ingestEngine.overview();
 t(typeof ov.cards.endpoints === 'number', 'overview returns card counts');

 console.log('\n' + (fails ? fails + ' smoke check(s) failed' : 'all smoke checks passed'));
 process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
