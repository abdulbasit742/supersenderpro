// lib/unifiedSetup/connectors/playbookConnector.js — Safe inspector for the Playbooks / SOPs module.
// Does NOT import or run the module; only reports presence + safe status.

const { inspect } = require('./_base');

const SPEC = {
  "id": "playbooks",
  "label": "Playbooks / SOPs",
  "category": "ops",
  "libs": [
    "lib/mergeFields.js"
  ],
  "routes": [],
  "pages": [],
  "envRequired": [],
  "docsLink": "docs/UNIFIED_SETUP_WIZARD.md"
};

function status() { return inspect(SPEC); }

module.exports = { status, SPEC };
