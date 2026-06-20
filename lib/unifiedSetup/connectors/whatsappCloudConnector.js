// lib/unifiedSetup/connectors/whatsappCloudConnector.js — Safe inspector for the WhatsApp Cloud API module.
// Does NOT import or run the module; only reports presence + safe status.

const { inspect } = require('./_base');

const SPEC = {
  "id": "whatsapp_cloud",
  "label": "WhatsApp Cloud API",
  "category": "messaging",
  "libs": [
    "lib/watiBroadcast.js"
  ],
  "routes": [
    "routes/wati.js"
  ],
  "pages": [],
  "envRequired": [
    "WHATSAPP_CLOUD_TOKEN",
    "WHATSAPP_PHONE_NUMBER_ID"
  ],
  "envOptional": [
    "WHATSAPP_VERIFY_TOKEN"
  ],
  "docsLink": "docs/SETUP_CREDENTIAL_CHECKLIST.md",
  "needsManualAction": true,
  "liveActionRisk": true
};

function status() { return inspect(SPEC); }

module.exports = { status, SPEC };
