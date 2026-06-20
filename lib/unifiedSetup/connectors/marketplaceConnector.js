// lib/unifiedSetup/connectors/marketplaceConnector.js — Safe inspector for the Marketplace Intelligence module.
// Does NOT import or run the module; only reports presence + safe status.

const { inspect } = require('./_base');

const SPEC = {
  "id": "marketplace_intelligence",
  "label": "Marketplace Intelligence",
  "category": "intelligence",
  "libs": [
    "lib/marketplaceIntelligence.js"
  ],
  "routes": [
    "routes/marketplaceIntelligenceRoutes.js"
  ],
  "pages": [
    "public/marketplace-intelligence.html"
  ],
  "envRequired": [],
  "docsLink": "docs/UNIFIED_SETUP_WIZARD.md",
  "routeLink": "/marketplace-intelligence.html"
};

function status() { return inspect(SPEC); }

module.exports = { status, SPEC };
