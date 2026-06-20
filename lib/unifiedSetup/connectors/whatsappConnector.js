// lib/unifiedSetup/connectors/whatsappConnector.js — Safe inspector for the WhatsApp (Local/Baileys) module.
// Does NOT import or run the module; only reports presence + safe status.

const { inspect } = require('./_base');

const SPEC = {
  "id": "whatsapp_local",
  "label": "WhatsApp (Local/Baileys)",
  "category": "messaging",
  "libs": [
    "wa-sales-bot/index.js"
  ],
  "routes": [],
  "pages": [],
  "envRequired": [],
  "envOptional": [
    "WA_SESSION_DIR"
  ],
  "docsLink": "docs/UNIFIED_SETUP_WIZARD.md",
  "needsManualAction": true,
  "liveActionRisk": true
};

function status() { return inspect(SPEC); }

module.exports = { status, SPEC };
