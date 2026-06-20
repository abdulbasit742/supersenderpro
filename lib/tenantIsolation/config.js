// lib/tenantIsolation/config.js — Config for the Multi-Tenant Data Isolation + Workspace Boundary + Leak Detection Command Center.
// Dry-run by default. Cross-tenant blocked, PII/secrets redacted, no raw export. No external calls.
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'data');
function bool(v, def = false) { if (v === undefined || v === null || v === '') return def; return String(v).trim().toLowerCase() === 'true'; }
function resolvePath(envVal, fallbackRel) {
  const val = envVal && String(envVal).trim() ? String(envVal).trim() : fallbackRel;
  if (path.isAbsolute(val) || /^[A-Za-z]:[\\/]/.test(val)) return path.join(ROOT, fallbackRel);
  return path.join(ROOT, val);
}
const config = {
  enabled: bool(process.env.TENANT_ISOLATION_ENABLED, true),
  dryRun: bool(process.env.TENANT_ISOLATION_DRY_RUN, true),
  redactPii: bool(process.env.TENANT_ISOLATION_REDACT_PII, true),
  redactSecrets: bool(process.env.TENANT_ISOLATION_REDACT_SECRETS, true),
  blockCrossTenant: bool(process.env.TENANT_ISOLATION_BLOCK_CROSS_TENANT, true),
  allowRawExport: bool(process.env.TENANT_ISOLATION_ALLOW_RAW_EXPORT, false),
  requireSecurityEvent: bool(process.env.TENANT_ISOLATION_REQUIRE_SECURITY_EVENT, true),
  requireAuditEvent: bool(process.env.TENANT_ISOLATION_REQUIRE_AUDIT_EVENT, true),
  strict: bool(process.env.TENANT_ISOLATION_STRICT, false),
  hashSalt: process.env.TENANT_ISOLATION_HASH_SALT || 'supersender-tenant-isolation',
  paths: {
    root: ROOT, dataDir: DATA_DIR,
    store: resolvePath(process.env.TENANT_ISOLATION_STORE_PATH, 'data/tenant-isolation.json'),
    history: resolvePath(process.env.TENANT_ISOLATION_HISTORY_PATH, 'data/tenant-isolation-history.json'),
  },
};
module.exports = { config, bool, ROOT, DATA_DIR };
