'use strict';
/**
 * billingPortal.js — Payments & Billing Feature #5: the customer-facing billing view.
 *
 * This is the read/aggregate layer that powers a "My Billing" page: current plan + status, payment
 * history (invoices/receipts), any open dunning, and plan change (upgrade/downgrade). It owns NO new
 * storage — it composes the engines already built:
 *   - subscriptionLifecycle (#2): current plan, status, period, access
 *   - invoiceEngine (#3):        payment history + receipts
 *   - dunningEngine (#4):        any in-progress recovery
 *
 * Decoupled via require with graceful fallback so the portal still renders if a module is missing.
 */

let subs = null;     try { subs = require('./subscriptionLifecycle'); } catch { subs = null; }
let invoices = null; try { invoices = require('./invoiceEngine'); } catch { invoices = null; }
let dunning = null;  try { dunning = require('./dunningEngine'); } catch { dunning = null; }

// Optional plan catalogue loader so we can show names/prices and validate plan changes.
let planCatalog = null; // () => [{ id, name, price, period, ... }]
function setPlanCatalog(fn) { planCatalog = typeof fn === 'function' ? fn : null; }

function phoneOf(customer) {
  return String((customer && (customer.phone || customer.email || customer.id)) || customer || '').trim();
}

/** Full billing overview for one customer. */
function overview(customer) {
  const key = phoneOf(customer);
  const subscriptions = subs ? subs.listForCustomer(key) : [];
  const active = subscriptions.find(s => ['active', 'trialing', 'past_due', 'cancelled'].includes(s.status)) || null;

  const history = invoices ? invoices.listInvoices({ customerPhone: key }) : [];
  const openDunning = dunning ? dunning.listCases({ customer: key, status: 'open' }) : [];
  const plans = planCatalog ? planCatalog() : [];

  let currentPlan = null;
  if (active && plans.length) currentPlan = plans.find(p => p.id === active.planId) || { id: active.planId };
  else if (active) currentPlan = { id: active.planId };

  return {
    customer: key,
    currentPlan,
    subscription: active,
    access: active && subs ? subs.hasAccess(key, active.planId) : false,
    invoices: history.sort((a, b) => new Date(b.issuedAt) - new Date(a.issuedAt)),
    openDunning,
    availablePlans: plans
  };
}

/**
 * Upgrade/downgrade. Default switches at period end (no proration surprises); immediate=true swaps now.
 * This updates the subscription via lifecycle; actual proration/charge is left to the payment flow
 * (a real charge should go through checkout + fulfillment #1).
 */
async function changePlan(customer, newPlanId, { immediate = false } = {}) {
  if (!subs) throw new Error('subscription engine not available');
  if (!newPlanId) throw new Error('newPlanId is required');
  const key = phoneOf(customer);
  const current = subs.listForCustomer(key).find(s => ['active', 'trialing', 'past_due'].includes(s.status));

  if (planCatalog) {
    const plans = planCatalog();
    if (plans.length && !plans.some(p => p.id === newPlanId)) throw new Error(`unknown plan "${newPlanId}"`);
  }

  if (immediate || !current) {
    // cancel the old one now (if any) and activate the new plan immediately
    if (current) await subs.cancel(key, current.planId, { immediate: true });
    const sub = await subs.activate({ phone: key }, newPlanId);
    return { ok: true, mode: 'immediate', subscription: sub, note: 'charge the new plan via checkout/fulfillment' };
  }

  // schedule: let the current plan run to period end, then the new plan should activate on next renewal
  await subs.cancel(key, current.planId, { immediate: false }); // cancelAtPeriodEnd
  return {
    ok: true,
    mode: 'end_of_period',
    switchesAt: current.currentPeriodEnd,
    from: current.planId,
    to: newPlanId,
    note: 'activate the new plan at period end via checkout/fulfillment'
  };
}

module.exports = { setPlanCatalog, overview, changePlan };
