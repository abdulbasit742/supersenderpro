#!/usr/bin/env node
// scripts/api-gateway-check.js — Offline safety + behavior check. Run: npm run api-gateway:check

const ag = require('../lib/apiGateway');

let fails = 0;
function assert(cond, msg) { if (!cond) { fails++; console.error('FAIL -', msg); } else { console.log('pass -', msg); } }

(async () => {
 assert(ag && ag.keyStore, 'module loads');
 assert(ag.config.effective.liveWebhookDelivery === false, 'webhook delivery is dry-run by default (safe)');

 // Issue a scoped key: secret shown once, only hash stored.
 const issued = ag.keyStore.issue({ name: 'Test', scopes: ['contacts:read', 'messages:send'] });
 assert(issued.secret && issued.secret.startsWith(ag.config.keyPrefix + '_'), 'key issued with prefixed secret');
 const raw = ag.store.load().keys.find((k) => k.id === issued.key.id);
 assert(raw.hash && !raw.secret, 'only hash stored, no plaintext secret');

 // Verify works with the right secret, fails with a wrong one.
 assert(ag.keyStore.verifySecret(issued.secret) !== null, 'correct secret verifies');
 assert(ag.keyStore.verifySecret('ssk_wrong') === null, 'wrong secret rejected');

 // Scope enforcement.
 assert(ag.keyStore.hasScope(raw, 'contacts:read') === true, 'granted scope passes');
 assert(ag.keyStore.hasScope(raw, 'campaigns:write') === false, 'ungranted scope blocked');

 // Revoke -> verify fails.
 ag.keyStore.revoke(issued.key.id);
 assert(ag.keyStore.verifySecret(issued.secret) === null, 'revoked key no longer verifies');

 // Webhook subscription + signed dry-run delivery.
 const sub = ag.webhookSubscriptions.create({ url: 'https://example.com/hook', events: ['payment.succeeded'] });
 assert(sub.signingSecret, 'subscription returns signing secret once');
 const emitted = ag.webhookDispatcher.emit('payment.succeeded', { amount: 2000 });
 assert(emitted.queued === 1, 'matching event queues one delivery');
 const tick = await ag.webhookDispatcher.tick();
 assert(tick.dryRun === 1 && tick.delivered === 0, 'delivery is dry-run (recorded, not sent)');

 // Signature is deterministic for a given secret+ts+body.
 const sig1 = ag.webhookDispatcher.sign('s', 123, 'body');
 const sig2 = ag.webhookDispatcher.sign('s', 123, 'body');
 assert(sig1 === sig2 && sig1.length === 64, 'HMAC-SHA256 signature is stable + 64 hex chars');

 console.log('\n' + (fails ? fails + ' check(s) failed' : 'all api-gateway checks passed'));
 process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
