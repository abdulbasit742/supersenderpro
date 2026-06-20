// lib/saasBilling/config.js — Safe config for the SaaS Billing + Tenant License + Usage Metering Command Center.
// Enforcement is WARN-ONLY / DRY-RUN by default. Nothing is suspended, captured, or auto-verified
// unless an operator explicitly opts in via env. Never stores secrets.

const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'data');

function bool(v, def = false) {
  if (v === undefined || v === null || v === '') return def;
  return String(v).trim().toLowerCase() === 'true';
}
function num(v, def) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}
// Reject hardcoded absolute / windows paths from env; always resolve under repo ROOT.
function resolvePath(envVal, fallbackRel) {
  const val = envVal && String(envVal).trim() ? String(envVal).trim() : fallbackRel;
  if (path.isAbsolute(val) || /^[A-Za-z]:[\\/]/.test(val)) return path.join(ROOT, fallbackRel);
  return path.join(ROOT, val);
}

const config = {
  enabled: bool(process.env.SAAS_BILLING_ENABLED, true),
  dryRun: bool(process.env.SAAS_BILLING_DRY_RUN, true),
  warnOnly: bool(process.env.SAAS_BILLING_WARN_ONLY, true),
  enforceLimits: bool(process.env.SAAS_BILLING_ENFORCE_LIMITS, false),
  requireAdmin: bool(process.env.SAAS_BILLING_REQUIRE_ADMIN, true),
  autoVerifyPayments: bool(process.env.SAAS_BILLING_AUTO_VERIFY_PAYMENTS, false),
  allowLiveSuspension: bool(process.env.SAAS_BILLING_ALLOW_LIVE_SUSPENSION, false),
  allowPlanWrite: bool(process.env.SAAS_BILLING_ALLOW_PLAN_WRITE, false),
  defaultCurrency: process.env.SAAS_BILLING_DEFAULT_CURRENCY || 'PKR',
  defaultGraceDays: num(process.env.SAAS_BILLING_DEFAULT_GRACE_DAYS, 7),
  maxUsageEvents: num(process.env.SAAS_BILLING_MAX_USAGE_EVENTS, 5000),
  paths: {
    root: ROOT,
    dataDir: DATA_DIR,
    store: resolvePath(process.env.SAAS_BILLING_STORE_PATH, 'data/saas-billing.json'),
    license: resolvePath(process.env.SAAS_BILLING_LICENSE_PATH, 'data/saas-licenses.json'),
    usage: resolvePath(process.env.SAAS_BILLING_USAGE_PATH, 'data/saas-usage.json'),
    invoice: resolvePath(process.env.SAAS_BILLING_INVOICE_PATH, 'data/saas-invoices.json'),
    reseller: resolvePath(process.env.SAAS_BILLING_RESELLER_PATH, 'data/saas-resellers.json'),
    history: resolvePath(process.env.SAAS_BILLING_HISTORY_PATH, 'data/saas-billing-history.json'),
  },
};

// Effective enforcement: live blocking only when explicitly enabled AND dry-run turned off.
config.effective = {
  liveEnforcement: config.enabled && config.enforceLimits && !config.dryRun && !config.warnOnly,
  liveSuspension: config.enabled && config.allowLiveSuspension && !config.dryRun,
  liveAutoVerify: config.enabled && config.autoVerifyPayments && !config.dryRun,
  planWrite: config.enabled && config.allowPlanWrite,
};

module.exports = { config, bool, num, ROOT, DATA_DIR };
