// lib/platformControl/envReadinessScanner.js — presence-only env readiness. Values never read or returned.
'use strict';
const cfg = require('./config');

function getEnvReadiness() {
  const declared = cfg.envExampleKeys();
  const envKeysPreview = declared.slice(0, 120);
  const requiredKeysMissingPreview = cfg.REQUIRED_ENV.filter((k) => process.env[k] === undefined);
  const optionalKeysMissingPreview = cfg.RECOMMENDED_ENV.filter((k) => process.env[k] === undefined);
  const configuredKeysMaskedPreview = declared
    .filter((k) => process.env[k] !== undefined)
    .slice(0, 40)
    .map((k) => k + '=configured');
  const blockers = requiredKeysMissingPreview.map((k) => 'required_env_missing:' + k);
  return cfg.safetyFlags({
    secretsExposed: false,
    envKeysPreview,
    requiredKeysMissingPreview,
    optionalKeysMissingPreview,
    configuredKeysMaskedPreview,
    totalDeclaredPreview: declared.length,
    warnings: optionalKeysMissingPreview.map((k) => 'optional_env_missing:' + k),
    blockers,
  });
}
module.exports = { getEnvReadiness };
