// lib/saasBilling/paymentAdapters/existingPaymentAdapter.js — Safe adapter that DETECTS
// (but does not rebuild or call) the repo's existing payment system under backend/src/payment.
// It only reports presence so the billing layer can defer to the real verifier for review.

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..', '..');

const KNOWN = [
  'backend/src/payment/verifier.js',
  'backend/src/payment/jazzcash.js',
  'backend/src/payment/easypaisa.js',
  'backend/src/payment/emailParser.js',
  'backend/src/routes/payments.js',
  'automations/paymentReminder.js',
  'mcp/tools/paymentsTool.js',
];

function detect() {
  const found = KNOWN.filter((rel) => { try { return fs.existsSync(path.join(ROOT, rel)); } catch { return false; } });
  return {
    status: found.length ? 'existing_module_detected' : 'missing_config',
    configured: found.length > 0,
    modules: found,
    note: 'Existing payment verifier detected — billing layer defers to it for review. No rebuild, no direct calls.',
  };
}

// We intentionally do NOT import or invoke the verifier here to avoid side effects /
// prisma dependencies. Live wiring is a documented, opt-in integration point.
module.exports = { id: 'existing', name: 'Existing SuperSender Payment Modules', detect };
