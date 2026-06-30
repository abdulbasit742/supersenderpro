'use strict';
/**
 * billingPortal.js — Payments & Billing Feature #5: the customer-facing billing view.
 *
 * This is an *aggregator*: it doesn't own storage. It stitches together the pieces built in #2–#4
 * into one screen's worth of data and one action (change plan). A customer (or admin) can see:
 *   - current subscription(s) + status + renewal date + access
 *   - invoice / receipt history (with PDF links)
 *   - any open dunning case (failed payment recovery)
 * and can upgrade/downgrade, with a simple prorated credit for unused time on the old plan.
 *
 * Dependencies are required lazily so the portal degrades gracefully if a piece isn't wired yet.
 */

let subs = null;       try { subs = require('./subscriptionLifecycle'); } catch {}
let invoices = null;   try { invoices = require('./invoiceEngine'); } catch {}
let dunning = null;    try { dunning = require('./dunningEngine'); } catch {}

// Plan price book is injected so the portal doesn't hard-code pricing.
//   setPlanCatalog([{ id, name, price, periodDays }])
let PLANS = [];
function setPlanCatalog(plans) { if (Array.isArray(plans)) PLANS = plans; return PLANS; }
function planById(id) { return PLANS.find(p => p.id === id) || null; }

function customerKey(customer) {
  return String((customer && (customer.phone || customer.email || customer.id)) || customer || '').trim();
}

/** One consolidated billing view for a customer. */
function overview(customer) {
  const key = customerKey(customer);
  const subscriptions = subs ? subs.listForCustomer(key) : [];
  const invoiceList = invoices ? invoices.listInvoices({ customerPhone: (customer && customer.phone) || key }) : [];
  const dunningCases = dunning ? dunning.listCases({ customer: key }).filter(c => c.status === 'open') : [];

  return {
    customer: key,
    subscriptions: subscriptions.map(s => ({
      planId: s.planId,
      plan: planById(s.planId),
      status: s.status,
      currentPeriodEnd: s.currentPeriodEnd,
      cancelAtPeriodEnd: s.cancelAtPeriodEnd,
      access: subs ? subs.hasAccess(key, s.planId) : null
    })),
    invoices: invoiceList.map(i => ({
      number: i.number, status: i.status, total: i.total, currency: i.currency,
      issuedAt: i.issuedAt, paidAt: i.paidAt, pdfUrl: `/api/invoices/${i.number}/pdf`
    })),
    openDunning: dunningCases.map(c => ({ id: c.id, planId: c.planId, stepIndex: c.stepIndex, openedAt: c.openedAt })),
    availablePlans: PLANS
  };
}

/** Estimate a prorated credit for the unused portion of the current plan period. */
function proratedCredit(sub) {
  if (!sub || !sub.currentPeriodEnd || !sub.currentPeriodStart) return 0;
  const plan = planById(sub.planId);
  if (!plan || !plan.price) return 0;
  const start = new Date(sub.currentPeriodStart).getTime();
  const end = new Date(sub.currentPeriodEnd).getTime();
  const now = Date.now();
  if (now >= end || end <= start) return 0;
  const remainingFrac = (end - now) / (end - start);
  return Math.round(plan.price * remainingFrac * 100) / 100;
}

/**
 * Upgrade/downgrade. Returns the amount due now (new plan price minus prorated credit on the old one)
 * and performs the subscription switch via the lifecycle engine.
 * @returns {Object} { ok, fromPlan, toPlan, credit, amountDue, subscription }
 */
async function changePlan(customer, newPlanId) {
  if (!subs) throw new Error('subscription engine not available');
  const newPlan = planById(newPlanId);
  if (!newPlan) throw new Error('unknown plan');

  const key = customerKey(customer);
  const current = (subs.listForCustomer(key) || []).find(s => ['active','trialing','past_due'].includes(s.status));

  let credit = 0;
  if (current) {
    credit = proratedCredit(current);
    // end the old subscription immediately; the new one starts fresh
    await subs.cancel(customer, current.planId, { immediate: true });
  }

  const subscription = await subs.activate(customer, newPlanId, { periodDays: newPlan.periodDays });
  const amountDue = Math.max(0, Math.round((Number(newPlan.price || 0) - credit) * 100) / 100);

  return {
    ok: true,
    fromPlan: current ? current.planId : null,
    toPlan: newPlanId,
    credit,
    amountDue,
    subscription
  };
}

module.exports = { setPlanCatalog, overview, changePlan, proratedCredit };
