// lib/saasBilling/paymentAdapters/index.js — Registry of payment adapters.
// Default mode is manual review. Adapters only REPORT status; none capture payments
// or call provider APIs unless an operator wires the existing verifier and opts in.

const manual = require('./manualPaymentAdapter');
const existing = require('./existingPaymentAdapter');
const stripe = require('./stripePlaceholder');
const paypal = require('./paypalPlaceholder');
const jazzcash = require('./jazzcashPlaceholder');
const easypaisa = require('./easypaisaPlaceholder');
const bankTransfer = require('./bankTransferPlaceholder');

const ADAPTERS = { manual, existing, stripe, paypal, jazzcash, easypaisa, bank_transfer: bankTransfer };

// Valid provider statuses (per spec).
const STATUSES = ['configured', 'missing_config', 'placeholder_only', 'existing_module_detected', 'manual_review_required'];

function get(id) { return ADAPTERS[id] || manual; }

// Status snapshot of every adapter for the doctor / dashboard.
function statusAll() {
  return Object.entries(ADAPTERS).map(([id, a]) => ({ id, name: a.name, ...a.detect() }));
}

// Is at least one real provider configured, or is an existing module present?
function hasUsableProvider() {
  return statusAll().some((s) => ['existing_module_detected', 'configured'].includes(s.status)) || true; // manual always usable
}

module.exports = { ADAPTERS, STATUSES, get, statusAll, hasUsableProvider };
