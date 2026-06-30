'use strict';
/**
 * billingPortal.js — Payments & Billing Feature #5: the customer-facing billing view.
 *
 * This is the read/aggregate layer that powers a "My Billing" page. It doesn't own storage — it
 * stitches together the three engines already built:
 *   - subscriptionLifecycle (#2): current plan(s), status, renewal/expiry dates, access
 *   - invoiceEngine (#3):        invoice/receipt history
 *   - dunningEngine (#4):        any open failed-payment case
 *
 * It also implements plan changes (upgrade/downgrade) by activating the new plan's subscription and
 * cancelling the old one at period end — reusing lifecycle so behaviour stays consistent.
 */

let subs = null;
let invoices = null;
let dunning = null;
try { subs = require('./subscriptionLifecycle'); } catch { subs = null; }
try { invoices = require('./invoiceEngine'); } catch { invoices = null; }
try { dunning = require('./dunningEngine'); } catch { dunning = null; }

function customerKey(customer) {
  return String((customer && (customer.phone || customer.email || customer.id)) || customer || '').trim();
}

/**
 * Assemble everything a customer should see about their billing.
 * @param {Object|string} customer  contact object or a phone/email/id
 */
function getCustomerBilling(customer) {
  const key = customerKey(customer);
  const out = {
    customerKey: key,
    subscriptions: [],
    invoices: [],
    openDunning: [],
    summary: { activePlans: 0, hasPastDue: false, lifetimeInvoices: 0, lifetimePaid: 0 }
  };

  if (subs) {
    out.subscriptions = subs.listForCustomer(customer).map(s => ({
      ...s,
      access: subs.hasAccess(customer, s.planId)
    }));
    out.summary.activePlans = out.subscriptions.filter(s => s.status === 'active' || s.status === 'trialing').length;
    out.summary.hasPastDue = out.subscriptions.some(s => s.status === 'past_due');
  }

  if (invoices) {
    const phone = (customer && customer.phone) || (typeof customer === 'string' ? customer : null);
    const rows = phone ? invoices.listInvoices({ customerPhone: phone }) : [];
    out.invoices = rows;
    out.summary.lifetimeInvoices = rows.length;
    out.summary.lifetimePaid = Math.round(rows.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.total || 0), 0) * 100) / 100;
  }

  if (dunning) {
    out.openDunning = dunning.listCases({ customer }).filter(c => c.status === 'open');
  }

  return out;
}

/**
 * Change plan (upgrade/downgrade). Activates the new plan now and cancels the old one at period end
 * so the customer keeps what they paid for until it lapses.
 * @returns {Object} { newSubscription, oldCancelled }
 */
async function changePlan(customer, fromPlanId, toPlanId, opts = {}) {
  if (!subs) throw new Error('subscription engine not available');
  if (!toPlanId) throw new Error('toPlanId is required');
  const newSub = await subs.activate(customer, toPlanId, opts);
  let oldCancelled = null;
  if (fromPlanId && fromPlanId !== toPlanId) {
    oldCancelled = await subs.cancel(customer, fromPlanId, { immediate: false });
  }
  return { newSubscription: newSub, oldCancelled };
}

module.exports = { getCustomerBilling, changePlan };
