'use strict';
/**
 * lib/config/index.js - one typed, documented view of configuration.
 * Modules currently read process.env ad-hoc; this centralizes the common keys with types and
 * defaults, and provides a redacted report for boot logs / deploy-doctor. Non-breaking: existing
 * modules keep working; new code can read from here for consistency.
 */
const bool = (v, d = false) => (v === undefined || v === '' ? d : ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase()));
const int = (v, d) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : d; };
const csv = (v, d = []) => (v === undefined || v === '' ? d : String(v).split(',').map((s) => s.trim()).filter(Boolean));
const str = (v, d = '') => (v === undefined || v === null ? d : String(v));

const env = process.env;

const config = {
  core: { nodeEnv: str(env.NODE_ENV, 'development'), port: int(env.PORT, 3000), sessionSecret: str(env.SESSION_SECRET) },
  auth: { jwtSecret: str(env.AUTH_JWT_SECRET || env.SESSION_SECRET), jwtTtlSec: int(env.AUTH_JWT_TTL_SEC, 604800) },
  data: { driver: str(env.DB_DRIVER, 'json'), databaseUrl: str(env.DATABASE_URL) },
  redis: { url: str(env.REDIS_URL) },
  billing: { currency: str(env.BILLING_CURRENCY, 'PKR'), enforce: str(env.BILLING_ENFORCE, 'warn'), graceDays: int(env.BILLING_GRACE_DAYS, 3), stripeKey: str(env.STRIPE_SECRET_KEY), stripeWebhookSecret: str(env.STRIPE_WEBHOOK_SECRET) },
  sales: { dryRun: bool(env.SALES_PIPELINE_DRY_RUN, true) },
  alerts: { dryRun: bool(env.ADMIN_ALERT_DRY_RUN, true), recipients: csv(env.ADMIN_ALERT_RECIPIENTS) },
  notify: { dryRun: bool(env.NOTIFY_DRY_RUN, true) },
  observability: { logLevel: str(env.LOG_LEVEL, 'info'), sentryDsn: str(env.SENTRY_DSN), metricsToken: str(env.METRICS_TOKEN) },
  security: { corsOrigins: csv(env.CORS_ALLOWED_ORIGINS, ['*']), maxBodyBytes: int(env.SECURITY_MAX_BODY_BYTES, 2097152) },
  lifecycle: { shutdownDeadlineMs: int(env.SHUTDOWN_DEADLINE_MS, 15000), requestTimeoutMs: int(env.REQUEST_TIMEOUT_MS, 30000) },
};

// keys whose VALUES must never be printed
const SECRET_KEYS = /(secret|key|token|password|dsn|databaseurl|url)$/i;

function redactedReport() {
  const out = {};
  for (const [ns, vals] of Object.entries(config)) {
    out[ns] = {};
    for (const [k, v] of Object.entries(vals)) {
      if (SECRET_KEYS.test(k) && v) out[ns][k] = '(set)';
      else if (SECRET_KEYS.test(k)) out[ns][k] = '(unset)';
      else out[ns][k] = v;
    }
  }
  return out;
}

// typed ad-hoc getters for code that wants one-off values
const get = { bool: (key, d) => bool(env[key], d), int: (key, d) => int(env[key], d), csv: (key, d) => csv(env[key], d), str: (key, d) => str(env[key], d) };

module.exports = { config, redactedReport, get, helpers: { bool, int, csv, str } };
