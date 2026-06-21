'use strict';
const b = require('./_base');
function health() {
  const present = b.anyExists(['lib/localWorkerBridge/heartbeat.js', 'src/modules/channels']);
  if (!present) return b.unavailable('Channel Automation');
  // Heartbeat staleness is the main signal; read-only file presence check here.
  return b.record('healthy', 'Channel automation present (publisher + worker bridge)', { category: 'channel_automation',
recommendedFix: 'If publishing fails, check worker heartbeat + newsletter fallback.' });
}
module.exports = { health };
