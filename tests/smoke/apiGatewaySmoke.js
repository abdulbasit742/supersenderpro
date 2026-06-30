#!/usr/bin/env node
// tests/smoke/apiGatewaySmoke.js — Smoke test for rate limiting + retries + signature verify.
// Run: npm run api-gateway:smoke

const ag = require('../../lib/apiGateway');
const crypto = require('crypto');

let fails = 0;
function t(cond, msg) { console.log((cond ? 'ok   ' : 'FAIL ') + '- ' + msg); if (!cond) fails++; }

(async () => {
 t(!!ag.webhookDispatcher, 'dispatcher present');

 // Rate limiter: a tiny limit trips after N calls in the same window.
 const issued = ag.keyStore.issue({ name: 'RL', scopes: ['*'], rateLimitPerMin: 3 });
 const id = issued.key.id;
 let lastAllowed = true;
 for (let i = 0; i < 4; i++) lastAllowed = ag.rateLimiter.check(id, 3).allowed;
 t(lastAllowed === false, 'rate limiter blocks the 4th call when limit is 3/min');

 // Receiver-side signature verification mirrors dispatcher.sign().
 const secret = 'whsec_demo';
 const ts = Date.now();
 const body = JSON.stringify({ hello: 'world' });
 const sig = ag.webhookDispatcher.sign(secret, ts, body);
 const expected = crypto.createHmac('sha256', secret).update(`${ts}.${body}`).digest('hex');
 t(sig === expected, 'signature matches an independent HMAC computation (receivers can verify)');

 // Wire a failing sender + live delivery to exercise retry/backoff -> dead-letter.
 process.env.API_GATEWAY_LIVE_WEBHOOKS = 'true';
 delete require.cache[require.resolve('../../lib/apiGateway/config')];
 delete require.cache[require.resolve('../../lib/apiGateway/webhookDispatcher')];
 const ag2 = require('../../lib/apiGateway');
 ag2.webhookDispatcher.setSender(async () => ({ status: 500 })); // always fails
 const sub = ag2.webhookSubscriptions.create({ url: 'https://example.com/fail', events: ['ticket.created'] });
 ag2.webhookDispatcher.emit('ticket.created', { id: 'TKT-1' });
 // Force several immediate ticks (ignoring backoff time) by clearing nextAttemptAt.
 let dead = 0;
 for (let i = 0; i < (ag2.config.maxWebhookRetries + 1); i++) {
 const d = ag2.store.load();
 d.deliveries.forEach((r) => { if (r.subscriptionId === sub.subscription.id && r.status === 'pending') r.nextAttemptAt = new Date(0).toISOString(); });
 ag2.store.save(d);
 const res = await ag2.webhookDispatcher.tick();
 dead += res.dead;
 }
 t(dead >= 1, 'a persistently failing delivery eventually dead-letters after max retries');

 console.log('\n' + (fails ? fails + ' smoke check(s) failed' : 'all smoke checks passed'));
 process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
