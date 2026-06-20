// lib/saasBilling/paymentAdapters/paypalPlaceholder.js — PLACEHOLDER ONLY.
// Reports configuration status from env presence. NEVER calls PayPal APIs, never stores secrets.
module.exports = {
  id: 'paypal',
  name: 'PayPal',
  detect() {
    const have = ['PAYPAL_CLIENT_ID','PAYPAL_CLIENT_SECRET'].every((k) => !!(process.env[k] && String(process.env[k]).trim()));
    return { status: have ? 'placeholder_only' : 'missing_config', configured: false, requires: ['PAYPAL_CLIENT_ID','PAYPAL_CLIENT_SECRET'], note: 'PayPal integration is a placeholder. No live capture. Manual review required.' };
  },
  intent({ amount, currency }) {
    return { provider: 'paypal', status: 'manual_review_required', amount, currency, autoVerify: false };
  },
};
