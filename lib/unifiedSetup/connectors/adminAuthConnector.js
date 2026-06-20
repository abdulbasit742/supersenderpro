// lib/unifiedSetup/connectors/adminAuthConnector.js — Safe inspector for the Admin Auth / RBAC module.
// Does NOT import or run the module; only reports presence + safe status.

const { inspect } = require('./_base');

const SPEC = {
  "id": "admin_auth",
  "label": "Admin Auth / RBAC",
  "category": "security",
  "libs": [
    "lib/aiDashboard.js"
  ],
  "routes": [],
  "pages": [
    "public/re-login.html"
  ],
  "envRequired": [
    "JWT_SECRET"
  ],
  "envOptional": [
    "ADMIN_PASSWORD"
  ],
  "docsLink": "docs/UNIFIED_SETUP_WIZARD.md",
  "requiredForLaunch": true
};

function status() { return inspect(SPEC); }

module.exports = { status, SPEC };
