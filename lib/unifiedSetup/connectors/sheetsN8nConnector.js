// lib/unifiedSetup/connectors/sheetsN8nConnector.js — Safe inspector for the Google Sheets / n8n module.
// Does NOT import or run the module; only reports presence + safe status.

const { inspect } = require('./_base');

const SPEC = {
  "id": "google_sheets",
  "label": "Google Sheets / n8n",
  "category": "integrations",
  "libs": [
    "lib/reportingConnectors.js"
  ],
  "routes": [],
  "pages": [],
  "envRequired": [],
  "envOptional": [
    "GOOGLE_SHEETS_ID",
    "N8N_WEBHOOK_URL"
  ],
  "docsLink": "docs/SETUP_CREDENTIAL_CHECKLIST.md"
};

function status() { return inspect(SPEC); }

module.exports = { status, SPEC };
