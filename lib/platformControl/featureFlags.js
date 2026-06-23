// lib/platformControl/featureFlags.js — read-only feature flag registry (presence only, safe defaults).
'use strict';
const cfg = require('./config');

function getFeatureFlags() {
  const keys = cfg.envExampleKeys().filter(cfg.isFeatureFlagKey);
  const flagsPreview = keys.slice(0, 80).map((key) => {
    const configured = process.env[key] !== undefined;
    const enabledPreview = /^(1|true|yes|on)$/i.test(String(process.env[key] || ''));
    return { key, configured, enabledPreview, source: 'env_preview', safeDefault: true };
  });
  // Ensure the platform-control flag itself is represented.
  if (!flagsPreview.some((f) => f.key === cfg.FEATURE_KEY)) {
    flagsPreview.unshift({
      key: cfg.FEATURE_KEY,
      configured: process.env[cfg.FEATURE_KEY] !== undefined,
      enabledPreview: true, source: 'default_preview', safeDefault: true,
    });
  }
  return cfg.safetyFlags({ flagsPreview, totalPreview: flagsPreview.length, warnings: [], blockers: [] });
}
module.exports = { getFeatureFlags };
