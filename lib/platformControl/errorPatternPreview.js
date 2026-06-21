// lib/platformControl/errorPatternPreview.js — read-only, redacted error pattern preview. No real logs/stack traces.
'use strict';
const cfg = require('./config');

function getErrorPatterns() {
  // Representative, redaction-safe pattern catalogue (no real error data is read or exposed).
  const errorPatternsPreview = [
    { pattern: 'unhandled_promise_rejection', severity: 'medium', countPreview: 0 },
    { pattern: 'missing_env_key', severity: 'high', countPreview: 0 },
    { pattern: 'external_call_timeout', severity: 'low', countPreview: 0 },
    { pattern: 'rate_limit_hit', severity: 'low', countPreview: 0 },
  ];
  return cfg.safetyFlags({
    piiMasked: true,
    rawErrorsExposed: false,
    stackTracesExposed: false,
    errorPatternsPreview,
    warnings: [], blockers: [],
  });
}
module.exports = { getErrorPatterns };
