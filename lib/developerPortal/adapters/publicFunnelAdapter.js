// developerPortal/adapters/publicFunnelAdapter.js — safe adapter for Public Funnel.
const { makeAdapter } = require('./_baseAdapter');
module.exports = makeAdapter({ name:'Public Funnel', detectFiles:['saas/reSignup.js', 'public/re-signup.html'], events:['public_funnel.lead_created', 'public_funnel.demo_requested', 'public_funnel.trial_requested'] });
