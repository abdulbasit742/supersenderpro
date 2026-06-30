'use strict';
/**
 * lib/seed/demoData.js - populate a tenant with realistic demo data for onboarding, demos, and QA.
 * Uses the public subsystem APIs (auth/billing/salesPipeline) so seeded data behaves exactly like
 * real data and respects tenant isolation. Safe: only touches the given tenantId.
 */
const auth = require('../auth');
const billing = require('../billing');
const SP = require('../salesPipeline');
const repo = require('../db');

const CUSTOMERS = [
  { phone: '923001000001', name: 'Ayesha Khan', city: 'Karachi' },
  { phone: '923001000002', name: 'Bilal Ahmed', city: 'Lahore' },
  { phone: '923001000003', name: 'Fatima Noor', city: 'Islamabad' },
  { phone: '923001000004', name: 'Usman Tariq', city: 'Rawalpindi' },
];
const STAGES = ['NEW_LEAD', 'QUALIFIED', 'NEGOTIATION', 'PROPOSAL_SENT', 'WON'];

async function seedTenant(tenantId = 'demo', { ownerEmail = 'owner@demo.test', ownerPassword = 'demopassword1' } = {}) {
  repo.assertTenant(tenantId);
  const summary = { tenantId, created: {} };

  // owner (ignore if already exists)
  try { await auth.signup(tenantId, { email: ownerEmail, password: ownerPassword, name: 'Demo Owner' }); summary.created.owner = ownerEmail; }
  catch (e) { summary.created.owner = 'exists/' + e.message; }

  // plan
  try { await billing.setPlan(tenantId, 'pro'); summary.created.plan = 'pro'; } catch {}

  // customers
  let custN = 0;
  for (const c of CUSTOMERS) { await repo.create(tenantId, 'customers', Object.assign({ tier: 'Silver', totalOrders: 1, totalSpent: 5000 }, c)); custN++; }
  summary.created.customers = custN;

  // deals across stages + one quote/invoice on the won deal
  let dealN = 0; let wonDealId = null;
  for (let i = 0; i < STAGES.length; i++) {
    const cust = CUSTOMERS[i % CUSTOMERS.length];
    const deal = SP.pipeline.createDeal(tenantId, { contact: { phone: cust.phone, name: cust.name }, title: 'Deal ' + (i + 1), value: 10000 * (i + 1) });
    // move to the target stage step by step
    const order = ['QUALIFIED', 'NEGOTIATION', 'PROPOSAL_SENT', 'WON'];
    for (const st of order) { if (STAGES.indexOf(st) <= STAGES.indexOf(STAGES[i])) { try { SP.pipeline.moveStage(tenantId, deal.id, st); } catch {} } }
    if (STAGES[i] === 'WON') wonDealId = deal.id;
    dealN++;
  }
  summary.created.deals = dealN;

  if (wonDealId) {
    const q = SP.quotes.createQuote(tenantId, { dealId: wonDealId, items: [{ name: 'Pro plan (annual)', qty: 1, unitPrice: 99900 }], taxPercent: 0 });
    const inv = SP.quotes.createInvoice(tenantId, { quoteId: q.id });
    summary.created.quote = q.number; summary.created.invoice = inv.number;
  }

  return summary;
}

// remove demo data for a tenant (collections we seed into)
async function clearTenant(tenantId) {
  repo.assertTenant(tenantId);
  const cleared = {};
  for (const c of ['customers', 'deals', 'quotes', 'follow_ups', 'users', 'subscriptions']) {
    let n = 0; try { const rows = await repo.list(tenantId, c, {}); for (const r of rows) { if (await repo.remove(tenantId, c, r.id)) n++; } } catch {}
    cleared[c] = n;
  }
  return { tenantId, cleared };
}

module.exports = { seedTenant, clearTenant, CUSTOMERS, STAGES };
