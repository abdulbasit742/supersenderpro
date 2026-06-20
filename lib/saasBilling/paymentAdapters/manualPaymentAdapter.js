// lib/saasBilling/paymentAdapters/manualPaymentAdapter.js — Default adapter.
// Always requires manual admin review. Never calls any API.

module.exports = {
  id: 'manual',
  name: 'Manual / Offline Payment',
  detect() { return { status: 'manual_review_required', configured: true }; },
  // Returns instructions only; never marks anything paid.
  intent({ amount, currency }) {
    return { provider: 'manual', status: 'manual_review_required', amount, currency, autoVerify: false,
      instructions: 'Record payment offline, then mark invoice for manual review.' };
  },
};
