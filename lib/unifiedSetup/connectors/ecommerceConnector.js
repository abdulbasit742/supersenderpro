// lib/unifiedSetup/connectors/ecommerceConnector.js — Safe inspector for the Ecommerce Hub module.
// Does NOT import or run the module; only reports presence + safe status.

const { inspect } = require('./_base');

const SPEC = {
  "id": "ecommerce",
  "label": "Ecommerce Hub",
  "category": "commerce",
  "libs": [
    "lib/storeBuilder.js",
    "lib/productBotEngine.js",
    "lib/storeCRM.js"
  ],
  "routes": [],
  "pages": [
    "public/store.html"
  ],
  "envRequired": [],
  "envOptional": [
    "SHOPIFY_TOKEN",
    "WOOCOMMERCE_KEY"
  ],
  "docsLink": "docs/UNIFIED_SETUP_WIZARD.md"
};

function status() { return inspect(SPEC); }

module.exports = { status, SPEC };
