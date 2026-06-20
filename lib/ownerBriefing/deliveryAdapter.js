// lib/ownerBriefing/deliveryAdapter.js — Builds a DRY-RUN delivery packet for a briefing.
// NEVER sends by default. If live send is explicitly enabled, it still returns a packet for an
// existing sender to handle after approval — it does not call any external API itself.

const { config } = require('./config');

function buildPacket(briefing, { channel = config.channel, toMasked = '****owner' } = {}) {
  return {
    channel,
    to: toMasked,
    mode: config.effective.liveSend ? 'live_capable_requires_approval' : 'dry_run_manual',
    note: config.effective.liveSend
      ? 'Approved delivery can be handed to the existing sender. This adapter does not send directly.'
      : 'Live send disabled — owner views the briefing in the dashboard or sends manually.',
    textPreview: (briefing.text || '').slice(0, 800),
    dryRun: true,
    approvalRequired: true,
  };
}

module.exports = { buildPacket };
