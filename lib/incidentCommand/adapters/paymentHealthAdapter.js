'use strict';
const b = require('./_base');
function health() {
  const present = b.anyExists(['lib/paymentValidation/validator.js', 'lib/paymentValidation/store.js']);
  if (!present) return b.unavailable('Payments');
  const autoApprove = b.envTrue('PAYMENT_AUTO_APPROVE');
  if (autoApprove) return b.record('failing', 'Payment auto-approval is ENABLED (high risk)', { category: 'payments',
severity: 'critical', recommendedFix: 'Set PAYMENT_AUTO_APPROVE=false. Payments must be validation-only.' });
  return b.record('healthy', 'Payment validation present, dry-run/validation-only', { category: 'payments' });
}
module.exports = { health };
