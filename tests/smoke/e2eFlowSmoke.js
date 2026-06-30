'use strict';
/**
 * tests/smoke/e2eFlowSmoke.js - end-to-end cross-subsystem smoke + tenant-isolation proof.
 *
 * This is the test that matters most: it exercises the *seams between* the subsystems we shipped
 * (data layer + auth + billing + sales pipeline) in one realistic flow, then proves a second
 * tenant is fully isolated from the first across every collection.
 *
 * json driver, dry-run everywhere, no DB/Stripe/server needed. Usage: node tests/smoke/e2eFlowSmoke.js
 */
process.env.DB_DRIVER = 'json';
process.env.AUTH_JWT_SECRET = 'e2e-secret';
process.env.SALES_PIPELINE_DRY_RUN = 'true';

const assert = require('assert');
const auth = require('../../lib/auth');
const billing = require('../../lib/billing');
const SP = require('../../lib/salesPipeline');

const A = 'e2e_tenantA_' + Date.now();
const B = 'e2e_tenantB_' + Date.now();
let passed = 0;
const t = (n, fn) => fn().then(() => { passed++; console.log('OK', n); }).catch((e) => { console.error('XX', n, '-', e.message); process.exitCode = 1; });

(async () => {
  // ---- Tenant A: full lifecycle across subsystems ----
  let token;
  await t('A: signup first user -> owner', async () => {
    const r = await auth.signup(A, { email: 'founder@a.com', password: 'supersecret1', name: 'Founder A' });
    assert.strictEqual(r.user.role, 'owner');
    token = r.token;
  });
  await t('A: token resolves to the right tenant', async () => {
    const { user } = await auth.getUserFromToken(token);
    assert.strictEqual(user.tenantId, A);
  });
  await t('A: starts on free plan', async () => {
    const { plan } = await billing.planFor(A);
    assert.strictEqual(plan.id, 'free');
  });
  await t('A: usage metering + quota interact correctly', async () => {
    await billing.recordUsage(A, 'messagesPerMonth', 500);
    const q = await billing.checkQuota(A, 'message', 1);
    assert.strictEqual(q.allowed, false, 'free cap (500) reached -> blocked');
  });
  await t('A: upgrade to pro lifts the cap', async () => {
    await billing.setPlan(A, 'pro');
    const q = await billing.checkQuota(A, 'message', 100000);
    assert.ok(q.allowed && q.unlimited);
  });
  let deal;
  await t('A: deal lifecycle NEW_LEAD -> WON', async () => {
    deal = SP.pipeline.createDeal(A, { contact: { phone: '923001112233', name: 'Buyer' }, title: 'Pro annual', value: 99900 });
    SP.pipeline.moveStage(A, deal.id, 'QUALIFIED');
    SP.pipeline.moveStage(A, deal.id, 'NEGOTIATION');
    const won = SP.pipeline.moveStage(A, deal.id, 'WON');
    assert.strictEqual(won.outcome, 'won');
  });
  let invoiceTotal;
  await t('A: quote -> invoice generated with correct totals', async () => {
    const quote = SP.quotes.createQuote(A, { dealId: deal.id, contact: deal.contact, items: [{ name: 'Pro annual', qty: 1, unitPrice: 99900 }], taxPercent: 0 });
    const inv = SP.quotes.createInvoice(A, { quoteId: quote.id });
    assert.strictEqual(inv.total, 99900);
    invoiceTotal = inv.total;
  });
  await t('A: pipeline metrics reflect the win', async () => {
    const m = SP.pipeline.metrics(A);
    assert.strictEqual(m.won, 1);
    assert.strictEqual(m.winRate, 100);
  });

  // ---- Tenant B: must see NONE of tenant A's data ----
  await t('B: no users leaked from A', async () => {
    const users = await auth.listUsers(B);
    assert.strictEqual(users.length, 0);
  });
  await t('B: cannot log in with A credentials', async () => {
    let threw = false;
    try { await auth.login(B, { email: 'founder@a.com', password: 'supersecret1' }); } catch { threw = true; }
    assert.ok(threw, 'A user must not exist in B');
  });
  await t('B: starts clean on free plan (no A subscription)', async () => {
    const { plan, subscription } = await billing.planFor(B);
    assert.strictEqual(plan.id, 'free');
    assert.ok(!subscription.stripeSubscriptionId);
  });
  await t('B: sees none of A deals', async () => {
    const deals = SP.pipeline.listDeals(B, {});
    assert.strictEqual(deals.length, 0);
  });
  await t('B: sees none of A quotes/invoices', async () => {
    const docs = SP.quotes.list(B, {});
    assert.strictEqual(docs.length, 0);
  });
  await t('B: fresh metrics (no cross-tenant bleed)', async () => {
    const m = SP.pipeline.metrics(B);
    assert.strictEqual(m.won, 0);
    assert.strictEqual(m.totalDeals, 0);
  });

  console.log('\n' + passed + ' checks passed. invoiceTotal(A)=' + invoiceTotal);
  process.exit(process.exitCode || 0);
})();
