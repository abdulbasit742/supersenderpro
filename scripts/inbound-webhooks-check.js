#!/usr/bin/env node
// scripts/inbound-webhooks-check.js — Offline safety + behavior check. Run: npm run inbound-webhooks:check

const iw = require('../lib/inboundWebhooks');

let fails = 0;
function assert(cond, msg) { if (!cond) { fails++; console.error('FAIL -', msg); } else { console.log('pass -', msg); } }

(async () => {
 assert(iw && iw.ingestEngine, 'module loads');

 // Create an HMAC endpoint with a payload->event mapping.
 const created = iw.endpointStore.create({ source: 'shopify', scheme: 'hmac_sha256', signatureHeader: 'x-signature', mapping: { event: { path: 'topic' }, fields: { contact: 'customer.phone', amount: 'total_price' }, externalIdPath: 'id' } });
 assert(created.secret && created.url === '/_in/' + created.endpoint.slug, 'endpoint created with secret + url');
 assert(created.endpoint.secretMasked.indexOf(created.secret) === -1, 'secret is masked in the endpoint view');

 const body = JSON.stringify({ id: 'ord_1', topic: 'order.paid', total_price: 2500, customer: { phone: '+923001234567' } });
 const sig = iw.verify.hmacSha256(created.secret, body);

 // Bad signature rejected.
 const badRes = await iw.ingestEngine.ingest(created.endpoint.slug, body, { 'x-signature': 'nope' });
 assert(badRes.status === 401 && badRes.ok === false, 'bad signature rejected with 401');

 // Good signature accepted + normalized.
 const okRes = await iw.ingestEngine.ingest(created.endpoint.slug, body, { 'x-signature': sig });
 assert(okRes.status === 200 && okRes.event === 'order.paid', 'valid signature accepted + event mapped from payload');
 assert(okRes.normalized.amount === 2500 && okRes.normalized.contact === '+923001234567', 'nested fields mapped into the normalized event');

 // Duplicate (same external id) within window is ignored.
 const dup = await iw.ingestEngine.ingest(created.endpoint.slug, body, { 'x-signature': sig });
 assert(dup.status === 409 && dup.duplicate === true, 'redelivered event deduped');

 // Unknown endpoint -> 404.
 const unknown = await iw.ingestEngine.ingest('does-not-exist', '{}', {});
 assert(unknown.status === 404, 'unknown endpoint returns 404');

 // Invalid JSON -> 400 (with a valid signature over the bad body).
 const badBody = '{not json';
 const sig2 = iw.verify.hmacSha256(created.secret, badBody);
 const badJson = await iw.ingestEngine.ingest(created.endpoint.slug, badBody, { 'x-signature': sig2 });
 assert(badJson.status === 400, 'invalid JSON body returns 400');

 // Raw body is never stored in the event log (only normalized keys).
 const evs = iw.ingestEngine.events(10, created.endpoint.slug);
 assert(evs.length >= 1 && !('body' in evs[0]) && Array.isArray(evs[0].normalizedKeys), 'event log stores normalized keys, not the raw body');

 console.log('\n' + (fails ? fails + ' check(s) failed' : 'all inbound-webhooks checks passed'));
 process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
