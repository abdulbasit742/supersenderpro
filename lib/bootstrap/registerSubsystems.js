'use strict';
/**
 * lib/bootstrap/registerSubsystems.js - one entry point that wires every Phase 1/2/5 subsystem
 * into an existing Express app, in the correct order, each guarded so a single failure can't
 * abort boot.
 *
 * server.js gets ONE call:
 *     require('./lib/bootstrap/registerSubsystems').registerAll(app, server);
 *
 * Order:
 *   0. security headers + body-size guard
 *   0b. CORS
 *   0c. request timeout + slow-request log
 *   1. observability request tracing + http metrics
 *   2. rate-limit guards
 *   3. feature routers (auth, billing, sales, health, alerts, ops, dashboard, version, metrics,
 *      docs, tenants, api-keys, audit, compliance, scheduler)
 *   4. 404 (api) + error handler (last)
 *   5. background: uptime monitor, scheduler (default jobs), admin-alert polling, graceful shutdown
 */
function safe(report, name, fn) {
  try { fn(); report.mounted.push(name); }
  catch (e) { report.failed.push({ name, error: e && e.message }); if (report.logger && report.logger.warn) report.logger.warn({ msg: 'subsystem_mount_failed', name, err: e && e.message }); else console.warn('[bootstrap] ' + name + ' failed: ' + (e && e.message)); }
}

function registerAll(app, server) {
  if (!app || typeof app.use !== 'function') throw new Error('registerAll(app, server): a valid Express app is required');
  let logger = console; try { logger = require('../observability/logger'); } catch {}
  const report = { mounted: [], failed: [], logger };

  // 0) security headers + body-size guard first
  safe(report, 'security.headers', () => { const h = require('../security/headers'); app.use(h.securityHeaders()); app.use(h.bodySizeGuard()); });
  // 0b) CORS
  safe(report, 'security.cors', () => { const c = require('../security/cors'); app.use(c.cors()); });
  // 0c) request timeout + slow log
  safe(report, 'http.timeout', () => { const t = require('../http/timeout'); app.use(t.requestTimeout()); app.use(t.slowRequestLog()); });

  // 1) tracing + metrics
  safe(report, 'observability.tracing', () => { const obs = require('../observability'); app.use(obs.requestTracing()); });
  safe(report, 'observability.httpMetrics', () => { const m = require('../observability/metrics'); app.use(m.httpMetrics()); });

  // 2) rate-limit guards
  safe(report, 'security.rateLimits', () => {
    const g = require('../security/guards');
    app.use('/api/auth', g.authGuard);
    app.use('/api/billing/webhook', g.webhookGuard);
    app.use('/api', g.apiGuard);
  });

  // 3) feature routers
  const routers = [
    ['auth', '/api/auth', '../../routes/authRoutes'],
    ['billing', '/api/billing', '../../routes/billingRoutes'],
    ['salesPipeline', '/api/sales-pipeline', '../../routes/salesPipelineRoutes'],
    ['health', '/api/health', '../../routes/healthRoutes'],
    ['adminAlerts', '/api/admin-alerts', '../../routes/adminAlertRoutes'],
    ['observabilityOps', '/api/ops', '../../routes/observabilityRoutes'],
    ['opsDashboard', '/api/ops', '../../routes/opsDashboardRoutes'],
    ['version', '/version', '../../routes/versionRoutes'],
    ['metrics', '/metrics', '../../routes/metricsRoutes'],
    ['docs', '/api/docs', '../../routes/docsRoutes'],
    ['tenants', '/api/tenants', '../../routes/tenantRoutes'],
    ['apiKeys', '/api/api-keys', '../../routes/apiKeyRoutes'],
    ['audit', '/api/audit', '../../routes/auditRoutes'],
    ['compliance', '/api/compliance', '../../routes/complianceRoutes'],
    ['scheduler', '/api/scheduler', '../../routes/schedulerRoutes'],
  ];
  for (const [name, mount, modPath] of routers) {
    safe(report, name, () => { app.use(mount, require(modPath)); });
  }

  // 4) 404 for unknown /api + error handler last
  safe(report, 'http.notFound', () => { const { notFoundHandler } = require('../http/errors'); app.use(notFoundHandler('/api')); });
  safe(report, 'observability.errorHandler', () => { const obs = require('../observability'); app.use(obs.errorHandler()); });

  // 5) background + lifecycle
  safe(report, 'uptimeMonitor', () => { require('../observability/uptime').start(); });
  safe(report, 'scheduler', () => { const s = require('../scheduler'); require('../scheduler/jobs').registerDefaults(); s.start(); });
  safe(report, 'adminAlerts.polling', () => { require('../adminAlert').startPolling(); });
  safe(report, 'gracefulShutdown', () => {
    const lc = require('../lifecycle');
    lc.install(server || null);
    // ensure the scheduler stops cleanly on shutdown
    try { lc.onShutdown('scheduler', () => require('../scheduler').stop()); } catch {}
  });

  const line = { msg: 'subsystems_registered', mounted: report.mounted.length, failed: report.failed.length };
  (logger.info ? logger.info(line) : console.log('[bootstrap]', JSON.stringify(line)));
  if (report.failed.length) console.warn('[bootstrap] failed:', report.failed.map((f) => f.name).join(', '));
  return report;
}

module.exports = { registerAll };
