// lib/platformControl/queueReadiness.js — read-only queue/worker readiness. No Redis connection.
'use strict';
const cfg = require('./config');

function getQueueReadiness() {
  const queueAdapterAvailablePreview = cfg.anyExists(cfg.HINTS.queue);
  const redisConfiguredPreview = !!process.env.REDIS_URL;
  const bullEnabledPreview = /^(1|true|yes|on)$/i.test(String(process.env.ZERO_TOUCH_ENABLE_BULL || ''));
  return cfg.safetyFlags({
    liveQueueMutation: false,
    redisConfiguredPreview,
    bullEnabledPreview,
    queueAdapterAvailablePreview,
    schedulerAvailablePreview: cfg.exists('lib/channelAutomationCenter.js') || cfg.exists('lib/queueManager.js'),
    inMemoryFallbackAvailablePreview: true,
    warnings: redisConfiguredPreview ? [] : ['redis_not_configured_using_in_memory_fallback_preview'],
    blockers: [],
  });
}
module.exports = { getQueueReadiness };
