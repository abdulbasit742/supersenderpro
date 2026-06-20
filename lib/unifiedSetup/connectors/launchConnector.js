// lib/unifiedSetup/connectors/launchConnector.js — Safe inspector for the Launch Center module.
// Does NOT import or run the module; only reports presence + safe status.

const { inspect } = require('./_base');

const SPEC = {
  "id": "launch_center",
  "label": "Launch Center",
  "category": "launch",
  "libs": [
    "scripts/launch-readiness.js",
    "scripts/public-launch-check.js"
  ],
  "routes": [],
  "pages": [],
  "envRequired": [],
  "docsLink": "docs/PILOT_LAUNCH_GUIDE.md"
};

function status() { return inspect(SPEC); }

module.exports = { status, SPEC };
