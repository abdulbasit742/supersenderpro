// lib/platformControl/secretPresenceChecker.js — presence-only secret check. Never exposes any value.
'use strict';
const cfg = require('./config');

function getSecretPresence() {
  const secretPresencePreview = cfg.SECRET_KEYS.map((key) => {
    const present = !!process.env[key];
    return { key, present, valueMasked: present ? 'configured' : 'not_configured' };
  });
  const missing = secretPresencePreview.filter((s) => !s.present).map((s) => s.key);
  return cfg.safetyFlags({
    secretsExposed: false,
    secretPresencePreview,
    missingSecretsPreview: missing,
    warnings: missing.length ? ['some_secrets_not_configured_preview'] : [],
    blockers: [],
  });
}
module.exports = { getSecretPresence };
