'use strict';
/**
 * lib/deploy/envSchema.js - declarative environment contract for production.
 * Each entry: { key, required, group, default, note }. `validate()` returns
 * { ok, missing, warnings, resolved } so deploy-doctor can give a clear go/no-go.
 *
 * Philosophy: almost everything has a SAFE default (dry-run / json / memory), so the app
 * boots even with a bare env. 'required' is reserved for things that are genuinely unsafe
 * to leave at their dev default in production (e.g. secrets).
 */
const SCHEMA = [
  // Core
  { key: 'NODE_ENV', required: false, group: 'core', default: 'production', note: 'set to production in prod' },
  { key: 'PORT', required: false, group: 'core', default: '3000' },
  { key: 'SESSION_SECRET', required: true, group: 'core', note: 'strong random; do NOT ship the default' },
  // Auth
  { key: 'AUTH_JWT_SECRET', required: true, group: 'auth', note: 'strong random; falls back to SESSION_SECRET if unset' },
  { key: 'AUTH_JWT_TTL_SEC', required: false, group: 'auth', default: '604800' },
  // Data
  { key: 'DB_DRIVER', required: false, group: 'data', default: 'json', note: 'json (default) or postgres' },
  { key: 'DATABASE_URL', required: false, group: 'data', note: 'required only when DB_DRIVER=postgres' },
  // Redis
  { key: 'REDIS_URL', required: false, group: 'redis', note: 'unset = in-memory single-instance; set for multi-instance' },
  // Billing
  { key: 'STRIPE_SECRET_KEY', required: false, group: 'billing', note: 'required to take live payments' },
  { key: 'STRIPE_WEBHOOK_SECRET', required: false, group: 'billing', note: 'required to verify Stripe webhooks' },
  { key: 'BILLING_ENFORCE', required: false, group: 'billing', default: 'warn', note: 'warn | block' },
  // Alerts / observability
  { key: 'ADMIN_ALERT_DRY_RUN', required: false, group: 'observability', default: 'true' },
  { key: 'SENTRY_DSN', required: false, group: 'observability', note: 'optional error tracking' },
  { key: 'LOG_LEVEL', required: false, group: 'observability', default: 'info' },
  // Lifecycle
  { key: 'SHUTDOWN_DEADLINE_MS', required: false, group: 'lifecycle', default: '15000' },
];

const INSECURE_DEFAULTS = { SESSION_SECRET: ['', 'changeme', 'dev', 'secret'], AUTH_JWT_SECRET: ['', 'dev-insecure-secret-change-me'] };

function validate(env = process.env) {
  const missing = [];
  const warnings = [];
  const resolved = {};
  for (const item of SCHEMA) {
    let val = env[item.key];
    if ((val === undefined || val === '') && item.default !== undefined) { val = item.default; resolved[item.key] = '(default) ' + item.default; }
    else if (val !== undefined && val !== '') { resolved[item.key] = item.group === 'auth' || /SECRET|KEY|URL|DSN/.test(item.key) ? '(set)' : val; }
    if (item.required && (val === undefined || val === '')) missing.push({ key: item.key, note: item.note });
    const insecure = INSECURE_DEFAULTS[item.key];
    if (insecure && insecure.includes(String(env[item.key] || ''))) warnings.push(item.key + ' is empty/insecure - set a strong value before production');
  }
  // Cross-field rules
  if (String(env.DB_DRIVER) === 'postgres' && !env.DATABASE_URL) missing.push({ key: 'DATABASE_URL', note: 'DB_DRIVER=postgres requires DATABASE_URL' });
  if (env.STRIPE_SECRET_KEY && !env.STRIPE_WEBHOOK_SECRET) warnings.push('STRIPE_SECRET_KEY set without STRIPE_WEBHOOK_SECRET - webhooks will not verify');
  if (String(env.BILLING_ENFORCE) === 'block' && !env.STRIPE_SECRET_KEY) warnings.push('BILLING_ENFORCE=block without Stripe configured - paid plans cannot be purchased');
  return { ok: missing.length === 0, missing, warnings, resolved };
}

module.exports = { SCHEMA, validate };
