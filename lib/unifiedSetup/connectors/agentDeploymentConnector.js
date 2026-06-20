// lib/unifiedSetup/connectors/agentDeploymentConnector.js — Safe inspector for the AI Agent Deployment module.
// Does NOT import or run the module; only reports presence + safe status.

const { inspect } = require('./_base');

const SPEC = {
  "id": "agent_deployment",
  "label": "AI Agent Deployment",
  "category": "ai",
  "libs": [
    "agent-runtime/server.js"
  ],
  "routes": [
    "routes/agentRuntime.js"
  ],
  "pages": [],
  "envRequired": [],
  "envOptional": [
    "AGENT_WEBHOOK_URL"
  ],
  "docsLink": "docs/UNIFIED_SETUP_WIZARD.md"
};

function status() { return inspect(SPEC); }

module.exports = { status, SPEC };
