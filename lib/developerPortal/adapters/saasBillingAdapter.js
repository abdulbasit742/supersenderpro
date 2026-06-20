// developerPortal/adapters/saasBillingAdapter.js — safe adapter for SaaS Billing.
const { makeAdapter } = require('./_baseAdapter');
module.exports = makeAdapter({ name:'SaaS Billing', detectFiles:['lib/subscriptionPlans.js'], events:['billing.preview_created', 'tenant.setup_preview_created'] });
