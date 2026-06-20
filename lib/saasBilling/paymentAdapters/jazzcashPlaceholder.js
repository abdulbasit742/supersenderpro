// lib/saasBilling/paymentAdapters/jazzcashPlaceholder.js — PLACEHOLDER ONLY.
// Reports configuration status from env presence. NEVER calls JazzCash APIs, never stores secrets.
module.exports = {
  id: 'jazzcash',
  name: 'JazzCash',
  detect() {
    const have = ['JAZZCASH_MERCHANT_ID','JAZZCASH_PASSWORD'].every((k) => !!(process.env[k] && String(process.env[k]).trim()));
    return { status: have ? 'placeholder_only' : 'missing_config', configured: false, requires: ['JAZZCASH_MERCHANT_ID','JAZZCASH_PASSWORD'], note: 'JazzCash integration is a placeholder. No live capture. Manual review required.' };
  },
  intent({ amount, currency }) {
    return { provider: 'jazzcash', status: 'manual_review_required', amount, currency, autoVerify: false };
  },
};
