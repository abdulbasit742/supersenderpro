// lib/unifiedSetup/connectors/socialConnector.js — Safe inspector for the Social Media module.
// Does NOT import or run the module; only reports presence + safe status.

const { inspect } = require('./_base');

const SPEC = {
  "id": "social",
  "label": "Social Media",
  "category": "marketing",
  "libs": [
    "lib/adsManager.js"
  ],
  "routes": [
    "routes/ads.js"
  ],
  "pages": [],
  "envRequired": [],
  "envOptional": [
    "META_OAUTH_TOKEN",
    "LINKEDIN_TOKEN",
    "TIKTOK_TOKEN"
  ],
  "docsLink": "docs/SETUP_CREDENTIAL_CHECKLIST.md",
  "liveActionRisk": true
};

function status() { return inspect(SPEC); }

module.exports = { status, SPEC };
