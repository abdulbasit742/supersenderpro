// lib/unifiedSetup/connectors/voiceAIConnector.js — Safe inspector for the Voice AI Command Center module.
// Does NOT import or run the module; only reports presence + safe status.

const { inspect } = require('./_base');

const SPEC = {
  "id": "voice_ai",
  "label": "Voice AI Command Center",
  "category": "ai",
  "libs": [
    "lib/voiceAI/index.js"
  ],
  "routes": [
    "routes/voiceAIRoutes.js"
  ],
  "pages": [
    "public/voice-ai.html"
  ],
  "envRequired": [],
  "envOptional": [
    "ELEVENLABS_API_KEY",
    "OPENAI_AUDIO_API_KEY",
    "DEEPGRAM_API_KEY"
  ],
  "docsLink": "docs/VOICE_AI_COMMAND_CENTER.md",
  "routeLink": "/voice-ai.html"
};

function status() { return inspect(SPEC); }

module.exports = { status, SPEC };
