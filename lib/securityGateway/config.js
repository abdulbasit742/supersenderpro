// lib/securityGateway/config.js — Config for the Security Gateway + Rate Limit + Abuse Protection Command Center.
// Dry-run / report-only by default. No raw IP, PII redacted, secrets redacted. No external calls.
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'data');

function bool(v, def = false) { if (v === undefined || v === null || v === '') return def; return String(v).trim().toLowerCase() === 'true'; }
function num(v, def) { const n = Number(v); return Number.isFinite(n) ? n : def; }
function resolvePath(envVal, fallbackRel) {
  const val = envVal && String(envVal).trim() ? String(envVal).trim() : fallbackRel;
  if (path.isAbsolute(val) || /^[A-Za-z]:[\\/]/.test(val)) return path.join(ROOT, fallbackRel);
  return path.join(ROOT, val);
}

const config = {
  enabled: bool(process.env.SECURITY_GATEWAY_ENABLED, true),
  dryRun: bool(process.env.SECURITY_GATEWAY_DRY_RUN, true),
  enforce: bool(process.env.SECURITY_GATEWAY_ENFORCE, false),
  strict: bool(process.env.SECURITY_GATEWAY_STRICT, false),
  hashIp: bool(process.env.SECURITY_GATEWAY_HASH_IP, true),
  redactPii: bool(process.env.SECURITY_GATEWAY_REDACT_PII, true),
  redactSecrets: bool(process.env.SECURITY_GATEWAY_REDACT_SECRETS, true),
  allowRawExport: bool(process.env.SECURITY_GATEWAY_ALLOW_RAW_EXPORT, false),
  hashSalt: process.env.SECURITY_GATEWAY_HASH_SALT || 'supersender-security-gateway',
  rateLimits: {
    publicFormLimit: num(process.env.SECURITY_GATEWAY_PUBLIC_FORM_LIMIT, 10),
    publicFormWindowSeconds: num(process.env.SECURITY_GATEWAY_PUBLIC_FORM_WINDOW_SECONDS, 600),
    developerApiLimit: num(process.env.SECURITY_GATEWAY_DEVELOPER_API_LIMIT, 300),
    developerApiWindowSeconds: num(process.env.SECURITY_GATEWAY_DEVELOPER_API_WINDOW_SECONDS, 600),
  },
  paths: {
    root: ROOT,
    dataDir: DATA_DIR,
    store: resolvePath(process.env.SECURITY_GATEWAY_STORE_PATH, 'data/security-gateway.json'),
    events: resolvePath(process.env.SECURITY_GATEWAY_EVENTS_PATH, 'data/security-events.json'),
    history: resolvePath(process.env.SECURITY_GATEWAY_HISTORY_PATH, 'data/security-gateway-history.json'),
  },
};

module.exports = { config, bool, num, ROOT, DATA_DIR };
