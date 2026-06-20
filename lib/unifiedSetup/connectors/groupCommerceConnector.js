// lib/unifiedSetup/connectors/groupCommerceConnector.js — Safe inspector for the Group Commerce OS module.
// Does NOT import or run the module; only reports presence + safe status.

const { inspect } = require('./_base');

const SPEC = {
  "id": "group_commerce",
  "label": "Group Commerce OS",
  "category": "commerce",
  "libs": [
    "lib/resellerNetwork.js"
  ],
  "routes": [],
  "pages": [],
  "envRequired": [],
  "docsLink": "docs/UNIFIED_SETUP_WIZARD.md"
};

function status() { return inspect(SPEC); }

module.exports = { status, SPEC };
