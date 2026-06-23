// lib/platformControl/rateLimitReadiness.js — read-only rate-limit readiness preview.
'use strict';
const cfg = require('./config');

function getRateLimitReadiness() {
  const securityModulePreview = cfg.anyExists(cfg.HINTS.rateLimit);
  const server = cfg.readText('server.js');
  const rateLimitHintPreview = /rate[-_]?limit|express-rate-limit|rateLimiter/i.test(server);
  return cfg.safetyFlags({
    liveRateLimitMutation: false,
    securityModulePreview,
    rateLimitHintPreview,
    waAutomationLimitsConfiguredPreview: !!process.env.WHATSAPP_AUTOMATION_DAILY_BROADCAST_LIMIT,
    warnings: (securityModulePreview || rateLimitHintPreview) ? [] : ['no_rate_limit_layer_detected_preview'],
    blockers: [],
  });
}
module.exports = { getRateLimitReadiness };
