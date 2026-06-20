// lib/saasBilling/paymentAdapters/stripePlaceholder.js — PLACEHOLDER ONLY.
// Reports configuration status from env presence. NEVER calls Stripe APIs, never stores secrets.
module.exports = {
  id: 'stripe',
  name: 'Stripe',
  detect() {
    const have = ['STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET'].every((k) => !!(process.env[k] && String(process.env[k]).trim()));
    return { status: have ? 'placeholder_only' : 'missing_config', configured: false, requires: ['STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET'], note: 'Stripe integration is a placeholder. No live capture. Manual review required.' };
  },
  intent({ amount, currency }) {
    return { provider: 'stripe', status: 'manual_review_required', amount, currency, autoVerify: false };
  },
};
