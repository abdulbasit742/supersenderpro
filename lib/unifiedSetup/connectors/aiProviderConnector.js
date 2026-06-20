// lib/unifiedSetup/connectors/aiProviderConnector.js — Safe inspector for the AI Providers module.
// Does NOT import or run the module; only reports presence + safe status.

const { inspect } = require('./_base');

const SPEC = {
  "id": "ai_providers",
  "label": "AI Providers",
  "category": "ai",
  "libs": [
    "lib/aiAgent.js",
    "lib/storeAIAgent.js"
  ],
  "routes": [],
  "pages": [],
  "envRequired": [],
  "envOptional": [
    "OPENAI_API_KEY",
    "ANTHROPIC_API_KEY",
    "GEMINI_API_KEY",
    "DEEPSEEK_API_KEY",
    "OPENROUTER_API_KEY",
    "GROQ_API_KEY"
  ],
  "docsLink": "docs/SETUP_CREDENTIAL_CHECKLIST.md"
};

function status() { return inspect(SPEC); }

module.exports = { status, SPEC };
