#!/usr/bin/env node
// scripts/payment-fulfillment-check.js — Offline safety + behavior check for the
// Payment Fulfillment bridge. Run: npm run payment-fulfillment:check

const pf = require('../lib/paymentFulfillment');

let fails = 0;
function assert(cond, msg) { if (!cond) { fails++; console.error('FAIL -', msg); } else { console.log('pass -', msg); } }

(async () => {
 assert(pf && pf.fulfillmentEngine, 'module loads');
 assert(pf.config.dryRun === true, 'dry-run is ON by default (safe)');
 assert(pf.config.effective.liveFulfillment === false, 'no live fulfillment unless explicitly opted in');
 assert(pf.config.effective.liveNotifications === false, 'no live notifications unless explicitly opted in');

 const doc = pf.doctor.run();
 assert(doc && doc.posture, 'doctor returns posture');

 // A verified Stripe-style event in dry-run must NOT mutate shared billing state.
 const r = await pf.fulfillmentEngine.fulfill({ gateway: 'stripe', eventId: 'evt_check_1', paymentReference: 'pi_check_1', tenantId: 'check-tenant', planId: 'starter', amount: 2000, currency: 'PKR', verified: true });
 assert(r.ok, 'fulfill returns ok');
 assert(r.status === 'planned', 'dry-run fulfillment is planned, not executed');
 assert(r.dryRun === true, 'dry-run flag preserved on the fulfillment record');
 assert(r.receipt && r.receipt.sent === false, 'receipt is drafted, not sent');

 // Idempotency: same event id + ref must not double-fulfill.
 const r2 = await pf.fulfillmentEngine.fulfill({ gateway: 'stripe', eventId: 'evt_check_1', paymentReference: 'pi_check_1', tenantId: 'check-tenant', planId: 'starter', verified: true });
 assert(r2.idempotent === true, 'duplicate event is idempotent');

 // Non-fulfillable stripe events are ignored.
 const ig = await pf.webhookHandlers.handleStripe({ id: 'evt_x', type: 'payment_intent.created', data: { object: {} } });
 assert(ig.ignored === true, 'non-fulfillable stripe event ignored');

 console.log('\n' + (fails ? fails + ' check(s) failed' : 'all payment-fulfillment checks passed'));
 process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
