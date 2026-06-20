// lib/voiceAI/adapters/localWorkerVoiceAdapter.js — Adapter to hand a voice job to an
// EXISTING local worker bridge. Never sends directly; returns a job descriptor only.

const { config } = require('./../config');

function buildJob({ queueItemId, channel = 'whatsapp', audioFilePath = null } = {}) {
  return {
    kind: 'voice_send_job',
    queueItemId,
    channel,
    audioFilePath,
    dryRun: !config.effective.liveSend,
    requiresApproval: config.requireApproval,
    note: config.effective.liveSend
      ? 'Local worker may process after explicit approval + consent.'
      : 'Live send disabled — job is informational only.',
  };
}

module.exports = { buildJob };
