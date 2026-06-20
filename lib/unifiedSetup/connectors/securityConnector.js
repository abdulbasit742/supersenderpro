// lib/unifiedSetup/connectors/securityConnector.js — Safe inspector for the Security Scan module.
// Does NOT import or run the module; only reports presence + safe status.

const { inspect } = require('./_base');

const SPEC = {
  "id": "security_scan",
  "label": "Security Scan",
  "category": "security",
  "libs": [
    "scripts/secret-scan.js"
  ],
  "routes": [],
  "pages": [],
  "envRequired": [],
  "docsLink": "docs/UNIFIED_SETUP_WIZARD.md"
};

function status() { return inspect(SPEC); }

module.exports = { status, SPEC };
