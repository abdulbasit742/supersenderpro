// lib/saasBilling/paymentAdapters/easypaisaPlaceholder.js — PLACEHOLDER ONLY.
// Reports configuration status from env presence. NEVER calls Easypaisa APIs, never stores secrets.
module.exports = {
  id: 'easypaisa',
  name: 'Easypaisa',
  detect() {
    const have = ['EASYPAISA_STORE_ID','EASYPAISA_HASH_KEY'].every((k) => !!(process.env[k] && String(process.env[k]).trim()));
    return { status: have ? 'placeholder_only' : 'missing_config', configured: false, requires: ['EASYPAISA_STORE_ID','EASYPAISA_HASH_KEY'], note: 'Easypaisa integration is a placeholder. No live capture. Manual review required.' };
  },
  intent({ amount, currency }) {
    return { provider: 'easypaisa', status: 'manual_review_required', amount, currency, autoVerify: false };
  },
};
