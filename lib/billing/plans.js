'use strict';
/**
 * lib/billing/plans.js - plan registry + limits. Single source of truth for tiers.
 * Limits: -1 means unlimited. Prices in minor units (paisa/cents) to avoid float drift.
 */
const PLANS = [
  {
    id: 'free', name: 'Free', priceMonthly: 0, currency: process.env.BILLING_CURRENCY || 'PKR',
    stripePriceId: process.env.STRIPE_PRICE_FREE || null,
    limits: { messagesPerMonth: 500, seats: 1, broadcasts: 2, contacts: 500 },
  },
  {
    id: 'starter', name: 'Starter', priceMonthly: 299900, currency: process.env.BILLING_CURRENCY || 'PKR',
    stripePriceId: process.env.STRIPE_PRICE_STARTER || null,
    limits: { messagesPerMonth: 10000, seats: 3, broadcasts: 50, contacts: 10000 },
  },
  {
    id: 'pro', name: 'Pro', priceMonthly: 999900, currency: process.env.BILLING_CURRENCY || 'PKR',
    stripePriceId: process.env.STRIPE_PRICE_PRO || null,
    limits: { messagesPerMonth: -1, seats: 10, broadcasts: -1, contacts: -1 },
  },
];

const getPlans = () => PLANS;
const getPlan = (id) => PLANS.find((p) => p.id === id) || null;
const defaultPlanId = () => process.env.BILLING_DEFAULT_PLAN || 'free';
function planForStripePrice(priceId) { return PLANS.find((p) => p.stripePriceId && p.stripePriceId === priceId) || null; }

module.exports = { getPlans, getPlan, defaultPlanId, planForStripePrice, PLANS };
