// developerPortal/apiKeys.js — safe API key handling.
// By default generates FAKE/DEMO keys. Never returns a real key. Stores only a hash + masked preview.
const crypto = require('crypto');
const { realKeysAllowed } = require('./safetyGuard');

function hash(v){ return crypto.createHash('sha256').update(String(v)).digest('hex'); }

// Returns { preview, hash, oneTime } — oneTime is only returned once and is a DEMO value unless real keys enabled.
function generatePreview(appId){
  const real = realKeysAllowed();
  const raw = (real ? 'sk_live_' : 'sk_demo_') + crypto.randomBytes(18).toString('hex');
  const preview = raw.slice(0, 11) + '...' + raw.slice(-4);
  return {
    isDemo: !real,
    apiKeyPreview: preview,
    apiKeyHash: hash(raw),
    oneTimeKey: raw,            // shown once by caller; never persisted
    note: real ? 'Live key — store securely, it will not be shown again.' : 'DEMO key only — not valid for real API calls.'
  };
}

module.exports = { generatePreview, hash };
