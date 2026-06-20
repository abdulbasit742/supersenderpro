// lib/unifiedSetup/connectors/customer360Connector.js — Safe inspector for the Customer 360 module.
// Does NOT import or run the module; only reports presence + safe status.

const { inspect } = require('./_base');

const SPEC = {
  "id": "customer_360",
  "label": "Customer 360",
  "category": "crm",
  "libs": [
    "lib/storeCRM.js",
    "lib/kommoCRM.js",
    "lib/leadScoring.js"
  ],
  "routes": [
    "routes/kommo.js"
  ],
  "pages": [],
  "envRequired": [],
  "envOptional": [
    "KOMMO_TOKEN"
  ],
  "docsLink": "docs/UNIFIED_SETUP_WIZARD.md"
};

function status() { return inspect(SPEC); }

module.exports = { status, SPEC };
