'use strict';
// Safe fallback stub generated because PDF extraction layout broke this file.
function preview(input) { return { ok: true, dryRun: true, previewOnly: true, readOnly: true, liveActionsEnabled: false, externalCallsEnabled: false, liveSend: false, liveAiCall: false, liveDbMutation: false, piiMasked: true, secretsExposed: false, note: 'source preserved in _duplicates_v27', inputPreview: input || null }; }
module.exports = { preview, workflow_orchestrator: preview };
