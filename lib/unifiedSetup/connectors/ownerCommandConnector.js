// lib/unifiedSetup/connectors/ownerCommandConnector.js — Safe inspector for the Owner Command module.
// Does NOT import or run the module; only reports presence + safe status.

const { inspect } = require('./_base');

const SPEC = {
  "id": "owner_command",
  "label": "Owner Command",
  "category": "ops",
  "libs": [
    "lib/aiDashboard.js"
  ],
  "routes": [
    "routes/growth.js"
  ],
  "pages": [
    "public/index.html"
  ],
  "envRequired": [],
  "docsLink": "docs/UNIFIED_SETUP_WIZARD.md"
};

function status() { return inspect(SPEC); }

module.exports = { status, SPEC };
