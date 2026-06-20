// lib/unifiedSetup/connectors/paymentConnector.js — Safe inspector for the Payments / Parser module.
// Does NOT import or run the module; only reports presence + safe status.

const { inspect } = require('./_base');

const SPEC = {
  "id": "payments",
  "label": "Payments / Parser",
  "category": "commerce",
  "libs": [
    "lib/txnStore.js"
  ],
  "routes": [],
  "pages": [],
  "envRequired": [],
  "envOptional": [
    "PAYMENT_IMAP_HOST",
    "PAYMENT_IMAP_USER",
    "PAYMENT_IMAP_PASS"
  ],
  "docsLink": "docs/SETUP_CREDENTIAL_CHECKLIST.md",
  "needsManualAction": true
};

function status() { return inspect(SPEC); }

module.exports = { status, SPEC };
