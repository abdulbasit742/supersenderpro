// lib/saasBilling/paymentAdapters/bankTransferPlaceholder.js — PLACEHOLDER ONLY.
// Reports configuration status from env presence. NEVER calls Bank Transfer APIs, never stores secrets.
module.exports = {
  id: 'bank_transfer',
  name: 'Bank Transfer',
  detect() {
    const have = ['BANK_TRANSFER_ACCOUNT_TITLE','BANK_TRANSFER_ACCOUNT_MASKED'].every((k) => !!(process.env[k] && String(process.env[k]).trim()));
    return { status: have ? 'placeholder_only' : 'missing_config', configured: false, requires: ['BANK_TRANSFER_ACCOUNT_TITLE','BANK_TRANSFER_ACCOUNT_MASKED'], note: 'Bank Transfer integration is a placeholder. No live capture. Manual review required.' };
  },
  intent({ amount, currency }) {
    return { provider: 'bank_transfer', status: 'manual_review_required', amount, currency, autoVerify: false };
  },
};
