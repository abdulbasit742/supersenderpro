// lib/unifiedSetup/connectors/channelAutomationConnector.js — Safe inspector for the Channel Automation module.
// Does NOT import or run the module; only reports presence + safe status.

const { inspect } = require('./_base');

const SPEC = {
  "id": "channel_automation",
  "label": "Channel Automation",
  "category": "automation",
  "libs": [
    "lib/channelAutomationCenter.js"
  ],
  "routes": [
    "routes/channelAutomation.js"
  ],
  "pages": [
    "public/channel-automation.html"
  ],
  "envRequired": [],
  "docsLink": "docs/UNIFIED_SETUP_WIZARD.md",
  "routeLink": "/channel-automation.html"
};

function status() { return inspect(SPEC); }

module.exports = { status, SPEC };
