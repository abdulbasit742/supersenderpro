#!/usr/bin/env node
// tests/smoke/paymentFulfillmentSmoke.js — Smoke test for receipts + reminders.
// Run: npm run payment-fulfillment:smoke

const pf = require('../../lib/paymentFulfillment');

let fails = 0;
function t(cond, msg) { console.log((cond ? 'ok   ' : 'FAIL ') + '- ' + msg); if (!cond) fails++; }

(async () => {
 t(!!pf.fulfillmentEngine, 'engine present');

 const rec = pf.receiptBuilder.buildReceipt({ tenantId: 'smoke', planId: 'pro', plan: { name: 'Pro', price: 12000, currency: 'PKR' }, amount: 12000, currency: 'PKR', paymentReference: 'pi_smoke_123456', gateway: 'stripe', invoiceNumber: 'INV-TEST' });
 t(rec.text.includes('Pro'), 'receipt text built with plan name');
 t(rec.paymentReferenceMasked.indexOf('123456') === -1, 'full payment ref never stored in receipt');

 const send = await pf.receiptBuilder.sendReceipt(rec, { to: '+923001234567' });
 t(send.sent === false && send.dryRun === true, 'receipt is draft-only without live notifications');

 const rems = pf.reminderScheduler.schedule({ renewalDueAt: new Date(Date.now() + 7 * 864e5).toISOString(), planId: 'pro' }, { tenantId: 'smoke', planId: 'pro', plan: { name: 'Pro', price: 12000, currency: 'PKR' } });
 t(rems.length > 0, 'reminders scheduled from license renewal date');
 t(rems.some((r) => r.kind === 'dunning'), 'post-due dunning reminders scheduled');
 t(rems.some((r) => r.kind === 'pre_renewal'), 'pre-renewal reminders scheduled');

 const run = await pf.reminderScheduler.run(Date.now() + 8 * 864e5, () => ({ name: 'Pro', price: 12000, currency: 'PKR' }));
 t(run.processed >= 1, 'due reminders processed');
 t(run.sent === 0, 'reminders drafted, not sent (safe default)');

 console.log('\n' + (fails ? fails + ' smoke check(s) failed' : 'all smoke checks passed'));
 process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
